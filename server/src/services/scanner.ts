import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import db, { COVERS_DIR } from '../db';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.aac', '.ogg', '.wav', '.m4a', '.opus', '.wma']);

// Noise patterns common in YouTube-converted filenames
const YOUTUBE_NOISE = [
  /\s*[\[(](official\s*(music\s*)?video|official\s*audio|official\s*lyric\s*video|lyrics?|lyric\s*video)[)\]]\s*/gi,
  /\s*[\[(](hq|hd|4k|1080p|720p|320kbps?)[)\]]\s*/gi,
  /\s*[\[(](slowed(\s*[+&]\s*(reverb|bass))?|reverb|nightcore|sped\s*up|speed\s*up|bass\s*boost(ed)?|lofi|lo-fi)[)\]]\s*/gi,
  /\s*[\[(]feat\.?\s[^\])].*?[)\]]\s*/gi,
  /\s*\(ft\.?\s[^)]*\)\s*/gi,
  /\s*-?\s*topic\s*$/gi,
];

function parseFilename(rawName: string): { title: string; artist: string | null } {
  let name = rawName;

  // Strip noise suffixes
  for (const re of YOUTUBE_NOISE) {
    name = name.replace(re, ' ');
  }
  name = name.trim().replace(/\s{2,}/g, ' ');

  // Try "Artist - Title" split — common YouTube format
  // First segment is treated as artist only when it's clearly shorter (e.g. "Rihanna - Where Have You Been")
  const match = name.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (match) {
    const left = match[1].trim();
    const right = match[2].trim();
    // Heuristic: shorter left = likely artist name, longer = song title with dash in it
    if (left.split(' ').length <= 3 && right.split(' ').length > left.split(' ').length) {
      return { artist: left, title: right };
    }
    // Otherwise treat full cleaned name as title, leave artist unset
    return { artist: null, title: name };
  }

  return { title: name, artist: null };
}

interface ScanStatus {
  isScanning: boolean;
  total: number;
  processed: number;
  errors: number;
  lastScanAt: string | null;
  currentFile: string | null;
}

let scanStatus: ScanStatus = {
  isScanning: false,
  total: 0,
  processed: 0,
  errors: 0,
  lastScanAt: null,
  currentFile: null,
};

export function getScanStatus(): ScanStatus {
  return { ...scanStatus };
}

function findAudioFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAudioFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (AUDIO_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

async function processSong(filePath: string): Promise<void> {
  const mm = await import('music-metadata');

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return;
  }

  let metadata;
  try {
    metadata = await mm.parseFile(filePath, { duration: true, skipCovers: false });
  } catch {
    // Still insert with basic file info
    metadata = { common: {}, format: {}, native: {} };
  }

  const { common, format } = metadata;

  // Extract and save cover art
  let coverArtFilename: string | null = null;
  const pictures = common.picture;
  if (pictures && pictures.length > 0) {
    const pic = pictures[0];
    const hash = crypto.createHash('md5').update(pic.data).digest('hex');
    coverArtFilename = `${hash}.jpg`;
    const coverPath = path.join(COVERS_DIR, coverArtFilename);
    if (!fs.existsSync(coverPath)) {
      fs.writeFileSync(coverPath, pic.data);
    }
  }

  // For untagged files (e.g. YouTube-converted MP3s), parse the filename
  const rawFilename = path.basename(filePath, path.extname(filePath));
  const parsed = (!common.title && !common.artist) ? parseFilename(rawFilename) : null;

  const title = common.title || parsed?.title || rawFilename;
  const artist = common.artist || common.albumartist || parsed?.artist || null;
  const albumArtist = common.albumartist || common.artist || parsed?.artist || null;
  const album = common.album || null;
  const year = common.year || null;
  const genre = common.genre ? common.genre[0] : null;
  const duration = format.duration || null;
  const trackNumber = common.track?.no || null;
  const discNumber = common.disk?.no || null;
  const fileSize = stat.size;
  const fileFormat = format.container || path.extname(filePath).slice(1).toUpperCase();
  const bitrate = format.bitrate ? Math.round(format.bitrate / 1000) : null;
  const sampleRate = format.sampleRate || null;

  const upsert = db.prepare(`
    INSERT INTO songs (
      title, artist, album_artist, album, year, genre, duration,
      track_number, disc_number, file_path, file_size, format,
      bitrate, sample_rate, cover_art, date_added
    ) VALUES (
      @title, @artist, @albumArtist, @album, @year, @genre, @duration,
      @trackNumber, @discNumber, @filePath, @fileSize, @format,
      @bitrate, @sampleRate, @coverArt, datetime('now')
    )
    ON CONFLICT(file_path) DO UPDATE SET
      title = @title,
      artist = @artist,
      album_artist = @albumArtist,
      album = @album,
      year = @year,
      genre = @genre,
      duration = @duration,
      track_number = @trackNumber,
      disc_number = @discNumber,
      file_size = @fileSize,
      format = @format,
      bitrate = @bitrate,
      sample_rate = @sampleRate,
      cover_art = @coverArt
  `);

  upsert.run({
    title,
    artist,
    albumArtist,
    album,
    year,
    genre,
    duration,
    trackNumber,
    discNumber,
    filePath,
    fileSize,
    format: fileFormat,
    bitrate,
    sampleRate,
    coverArt: coverArtFilename,
  });
}

export async function startScan(musicFolder: string): Promise<void> {
  if (scanStatus.isScanning) {
    return;
  }

  if (!fs.existsSync(musicFolder)) {
    throw new Error(`Music folder does not exist: ${musicFolder}`);
  }

  scanStatus = {
    isScanning: true,
    total: 0,
    processed: 0,
    errors: 0,
    lastScanAt: null,
    currentFile: null,
  };

  // Run scan asynchronously
  (async () => {
    try {
      const files = findAudioFiles(musicFolder);
      scanStatus.total = files.length;

      for (const file of files) {
        scanStatus.currentFile = path.basename(file);
        try {
          await processSong(file);
          scanStatus.processed++;
        } catch (err) {
          console.error(`Error processing ${file}:`, err);
          scanStatus.errors++;
        }
      }

      scanStatus.lastScanAt = new Date().toISOString();
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      scanStatus.isScanning = false;
      scanStatus.currentFile = null;
    }
  })();
}
