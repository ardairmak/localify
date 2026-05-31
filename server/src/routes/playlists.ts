import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET /api/playlists
router.get('/', (_req: Request, res: Response) => {
  const playlists = db.prepare(`
    SELECT p.*, COUNT(pt.song_id) as track_count
    FROM playlists p
    LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `).all();

  res.json({ playlists });
});

// POST /api/playlists
router.post('/', (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const result = db.prepare(`
    INSERT INTO playlists (name, description) VALUES (@name, @description)
  `).run({ name, description: description || null });

  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(playlist);
});

// GET /api/playlists/:id
router.get('/:id', (req: Request, res: Response) => {
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  const tracks = db.prepare(`
    SELECT s.*, pt.position, pt.added_at as track_added_at
    FROM songs s
    JOIN playlist_tracks pt ON s.id = pt.song_id
    WHERE pt.playlist_id = ?
    ORDER BY pt.position
  `).all(req.params.id);

  res.json({ ...playlist as object, tracks });
});

// PUT /api/playlists/:id
router.put('/:id', (req: Request, res: Response) => {
  const { name, description } = req.body;
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  db.prepare(`
    UPDATE playlists SET name = @name, description = @description, updated_at = datetime('now')
    WHERE id = @id
  `).run({ name: name || (playlist as { name: string }).name, description: description ?? null, id: req.params.id });

  const updated = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/playlists/:id
router.delete('/:id', (req: Request, res: Response) => {
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// POST /api/playlists/:id/tracks
router.post('/:id/tracks', (req: Request, res: Response) => {
  const { songId } = req.body;
  if (!songId) {
    return res.status(400).json({ error: 'songId is required' });
  }

  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId);
  if (!song) {
    return res.status(404).json({ error: 'Song not found' });
  }

  const maxPos = db.prepare(`
    SELECT COALESCE(MAX(position), -1) + 1 as next_pos
    FROM playlist_tracks WHERE playlist_id = ?
  `).get(req.params.id) as { next_pos: number };

  try {
    db.prepare(`
      INSERT INTO playlist_tracks (playlist_id, song_id, position)
      VALUES (@playlistId, @songId, @position)
    `).run({ playlistId: req.params.id, songId, position: maxPos.next_pos });

    db.prepare(`UPDATE playlists SET updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
    res.status(201).json({ message: 'Track added' });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Song already in playlist' });
    }
    throw err;
  }
});

// DELETE /api/playlists/:id/tracks/:songId
router.delete('/:id/tracks/:songId', (req: Request, res: Response) => {
  const result = db.prepare(`
    DELETE FROM playlist_tracks WHERE playlist_id = ? AND song_id = ?
  `).run(req.params.id, req.params.songId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Track not in playlist' });
  }

  db.prepare(`UPDATE playlists SET updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.status(204).send();
});

export default router;
