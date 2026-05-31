import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET /api/liked
router.get('/', (_req: Request, res: Response) => {
  const songs = db.prepare(`
    SELECT s.*, ls.liked_at
    FROM songs s
    JOIN liked_songs ls ON s.id = ls.song_id
    ORDER BY ls.liked_at DESC
  `).all();

  res.json({ songs });
});

// POST /api/liked/:id
router.post('/:id', (req: Request, res: Response) => {
  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
  if (!song) {
    return res.status(404).json({ error: 'Song not found' });
  }

  try {
    db.prepare(`
      INSERT INTO liked_songs (song_id) VALUES (?)
    `).run(req.params.id);
    res.status(201).json({ message: 'Song liked' });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Song already liked' });
    }
    throw err;
  }
});

// DELETE /api/liked/:id
router.delete('/:id', (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM liked_songs WHERE song_id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Song not in liked songs' });
  }

  res.status(204).send();
});

export default router;
