import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET /api/albums
router.get('/', (_req: Request, res: Response) => {
  const albums = db.prepare(`
    SELECT
      album as name,
      COALESCE(album_artist, artist) as artist,
      year,
      COUNT(*) as track_count,
      MAX(cover_art) as cover_art,
      SUM(duration) as total_duration
    FROM songs
    WHERE album IS NOT NULL
    GROUP BY album, COALESCE(album_artist, artist)
    ORDER BY album COLLATE NOCASE
  `).all();

  res.json({ albums });
});

// GET /api/albums/:album/:artist
router.get('/:album/:artist', (req: Request, res: Response) => {
  const album = decodeURIComponent(req.params.album);
  const artist = decodeURIComponent(req.params.artist);

  const songs = db.prepare(`
    SELECT * FROM songs
    WHERE album = @album AND (artist = @artist OR album_artist = @artist)
    ORDER BY disc_number, track_number, title
  `).all({ album, artist });

  if (songs.length === 0) {
    // Try without artist filter
    const songsByAlbum = db.prepare(`
      SELECT * FROM songs WHERE album = @album
      ORDER BY disc_number, track_number, title
    `).all({ album });

    if (songsByAlbum.length === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    return res.json({ album, songs: songsByAlbum });
  }

  res.json({ album, songs });
});

export default router;
