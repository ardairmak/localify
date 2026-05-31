import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import db, { COVERS_DIR } from '../db';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.aac', '.ogg', '.wav', '.m4a', '.opus', '.wma']);

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
  for (const re of YOUTUBE_NOISE) name = name.replace(re, ' ');
  name = name.trim().replace(/\s{2,}/g, ' ');

  const match = name.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (match) {
    const left = match[1].trim();
    const right = match[2].trim();
    if (left.split(' ').length <= 3 && right.split(' ').length > left.split(' ').length) {
      return { artist: left, title: right };
    }
    return { artist: null, title: name };
  }
  return { title: name, artist: null };
}

// ── iTunes cover art lookup ───────────────────────────────────────────────────

interface ItunesResult {
  artworkUrl100?: string;
  trackName?: string;
  artistName?: string;
}

async function fetchItunesCover(title: string, artist: string | null): Promise<Buffer | null> {
  try {
    const term = [artist, title].filter(Boolean).join(' ');
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=5&media=music`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json() as { results: ItunesResult[] };
    if (!data.results?.length) return null;

    // Pick the best match: prefer a result whose artist matches
    const result = data.results.find(r =>
      artist && r.artistName?.toLowerCase().includes(artist.toLowerCase())
    ) ?? data.results[0];

    const artUrl = result.artworkUrl100;
    if (!artUrl) return null;

    // Upgrade to 600×600
    const highRes = artUrl.replace('100x100bb', '600x600bb');
    const imgRes = await fetch(highRes, { signal: AbortSignal.timeout(8000) });
    if (!imgRes.ok) return null;

    return Buffer.from(await imgRes.arrayBuffer());
  } catch {
    return null;
  }
}

async function saveBuffer(buf: Buffer, ext = 'jpg'): Promise<string> {
  const hash = crypto.createHash('md5').update(buf).digest('hex');
  const filename = `${hash}.${ext}`;
  const dest = path.join(COVERS_DIR, filename);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, buf);
  return filename;
}

// ── Scan status ───────────────────────────────────────────────────────────────

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

// ── File discovery ────────────────────────────────────────────────────────────

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
    } else if (entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Song processing ───────────────────────────────────────────────────────────

async function processSong(filePath: string): Promise<void> {
  const mm = await import('music-metadata');

  let stat: fs.Stats;
  try { stat = fs.statSync(filePath); } catch { return; }

  let metadata;
  try {
    metadata = await mm.parseFile(filePath, { duration: true, skipCovers: false });
  } catch {
    metadata = { common: {}, format: {}, native: {} };
  }

  const { common, format } = metadata;

  // 1. Try embedded cover art
  let coverArtFilename: string | null = null;
  const pictures = (common as { picture?: { data: Buffer }[] }).picture;
  if (pictures?.length) {
    coverArtFilename = await saveBuffer(pictures[0].data);
  }

  // 2. Parse filename for untagged files
  const rawFilename = path.basename(filePath, path.extname(filePath));
  const parsed = (!common.title && !common.artist) ? parseFilename(rawFilename) : null;

  const title = common.title || parsed?.title || rawFilename;
  const artist = common.artist || (common as { albumartist?: string }).albumartist || parsed?.artist || null;
  const albumArtist = (common as { albumartist?: string }).albumartist || common.artist || parsed?.artist || null;
  const album = common.album || null;
  const year = (common as { year?: number }).year || null;
  const genre = (common as { genre?: string[] }).genre?.[0] ?? null;
  const duration = format.duration || null;
  const trackNumber = (common as { track?: { no?: number } }).track?.no || null;
  const discNumber = (common as { disk?: { no?: number } }).disk?.no || null;
  const fileSize = stat.size;
  const fileFormat = format.container || path.extname(filePath).slice(1).toUpperCase();
  const bitrate = format.bitrate ? Math.round(format.bitrate / 1000) : null;
  const sampleRate = format.sampleRate || null;

  // 3. If still no cover, check if DB already has one before hitting iTunes
  if (!coverArtFilename) {
    const existing = db.prepare('SELECT cover_art FROM songs WHERE file_path = ?').get(filePath) as { cover_art: string | null } | undefined;
    if (existing?.cover_art) {
      coverArtFilename = existing.cover_art; // keep existing
    } else {
      // 4. Fetch from iTunes
      const buf = await fetchItunesCover(title, artist);
      if (buf) {
        coverArtFilename = await saveBuffer(buf);
        console.log(`  ✓ iTunes cover: ${title}`);
      }
    }
  }

  db.prepare(`
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
      cover_art = COALESCE(@coverArt, cover_art)
  `).run({
    title, artist, albumArtist, album, year, genre, duration,
    trackNumber, discNumber, filePath, fileSize, format: fileFormat,
    bitrate, sampleRate, coverArt: coverArtFilename,
  });
}

// ── Public: scan a single file (used after download) ─────────────────────────

export async function processSingleFile(filePath: string): Promise<void> {
  return processSong(filePath);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function startScan(musicFolder: string): Promise<void> {
  if (scanStatus.isScanning) return;
  if (!fs.existsSync(musicFolder)) {
    throw new Error(`Music folder does not exist: ${musicFolder}`);
  }

  scanStatus = { isScanning: true, total: 0, processed: 0, errors: 0, lastScanAt: null, currentFile: null };

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
