import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET /api/search?q=
router.get('/', (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q || q.trim().length === 0) {
    return res.json({ songs: [], artists: [], albums: [] });
  }

  const term = `%${q.trim()}%`;

  const songs = db.prepare(`
    SELECT * FROM songs
    WHERE title LIKE @term OR artist LIKE @term OR album LIKE @term
    ORDER BY title COLLATE NOCASE
    LIMIT 20
  `).all({ term });

  const artists = db.prepare(`
    SELECT
      COALESCE(album_artist, artist) as name,
      COUNT(*) as song_count,
      MAX(cover_art) as cover_art
    FROM songs
    WHERE artist LIKE @term OR album_artist LIKE @term
    GROUP BY COALESCE(album_artist, artist)
    ORDER BY name COLLATE NOCASE
    LIMIT 10
  `).all({ term });

  const albums = db.prepare(`
    SELECT
      album as name,
      COALESCE(album_artist, artist) as artist,
      year,
      COUNT(*) as track_count,
      MAX(cover_art) as cover_art
    FROM songs
    WHERE album LIKE @term
    GROUP BY album, COALESCE(album_artist, artist)
    ORDER BY album COLLATE NOCASE
    LIMIT 10
  `).all({ term });

  res.json({ songs, artists, albums });
});

export default router;
