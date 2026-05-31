import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET /api/artists
router.get('/', (_req: Request, res: Response) => {
  const artists = db.prepare(`
    SELECT
      COALESCE(album_artist, artist) as name,
      COUNT(DISTINCT id) as song_count,
      COUNT(DISTINCT album) as album_count,
      MAX(cover_art) as cover_art
    FROM songs
    WHERE COALESCE(album_artist, artist) IS NOT NULL
    GROUP BY COALESCE(album_artist, artist)
    ORDER BY name COLLATE NOCASE
  `).all();

  res.json({ artists });
});

// GET /api/artists/:name
router.get('/:name', (req: Request, res: Response) => {
  const name = decodeURIComponent(req.params.name);

  const songs = db.prepare(`
    SELECT * FROM songs
    WHERE artist = @name OR album_artist = @name
    ORDER BY album, disc_number, track_number, title
  `).all({ name });

  if (songs.length === 0) {
    return res.status(404).json({ error: 'Artist not found' });
  }

  const albums = db.prepare(`
    SELECT
      album,
      year,
      COUNT(*) as track_count,
      MAX(cover_art) as cover_art
    FROM songs
    WHERE (artist = @name OR album_artist = @name) AND album IS NOT NULL
    GROUP BY album
    ORDER BY year, album
  `).all({ name });

  res.json({ name, songs, albums });
});

export default router;
