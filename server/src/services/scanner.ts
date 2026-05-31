import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import db, { COVERS_DIR } from '../db';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.aac', '.ogg', '.wav', '.m4a', '.opus', '.wma']);

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

  const title = common.title || path.basename(filePath, path.extname(filePath));
  const artist = common.artist || common.albumartist || null;
  const albumArtist = common.albumartist || common.artist || null;
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
