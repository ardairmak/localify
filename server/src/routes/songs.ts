import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../db';

const router = Router();

// GET /api/songs
router.get('/', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;
  const artist = req.query.artist as string | undefined;
  const album = req.query.album as string | undefined;
  const genre = req.query.genre as string | undefined;

  let where = 'WHERE 1=1';
  const params: Record<string, string | number> = {};

  if (artist) {
    where += ' AND artist = @artist';
    params.artist = artist;
  }
  if (album) {
    where += ' AND album = @album';
    params.album = album;
  }
  if (genre) {
    where += ' AND genre = @genre';
    params.genre = genre;
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM songs ${where}`).get(params) as { count: number }).count;
  const songs = db.prepare(`
    SELECT * FROM songs ${where}
    ORDER BY artist, album, disc_number, track_number, title
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });

  res.json({ songs, total, page, limit, pages: Math.ceil(total / limit) });
});

// GET /api/songs/:id
router.get('/:id', (req: Request, res: Response) => {
  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
  if (!song) {
    return res.status(404).json({ error: 'Song not found' });
  }
  res.json(song);
});

// GET /api/songs/:id/stream
router.get('/:id/stream', (req: Request, res: Response) => {
  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id) as { file_path: string; format: string } | undefined;
  if (!song) {
    return res.status(404).json({ error: 'Song not found' });
  }

  const filePath = song.file_path;

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return res.status(404).json({ error: 'Audio file not found on disk' });
  }

  const fileSize = stat.size;
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.opus': 'audio/opus',
    '.wma': 'audio/x-ms-wma',
  };
  const mimeType = mimeTypes[ext] || 'audio/mpeg';

  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

export default router;
