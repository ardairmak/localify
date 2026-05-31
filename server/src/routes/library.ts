import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import db from '../db';
import { startScan, getScanStatus } from '../services/scanner';

const router = Router();

// GET /api/library/settings
router.get('/settings', (_req: Request, res: Response) => {
  const settings = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const result: Record<string, string> = {};
  for (const s of settings) {
    result[s.key] = s.value;
  }
  res.json(result);
});

// POST /api/library/settings
router.post('/settings', (req: Request, res: Response) => {
  const { music_folder_path } = req.body;
  if (!music_folder_path) {
    return res.status(400).json({ error: 'music_folder_path is required' });
  }

  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('music_folder_path', @value)
    ON CONFLICT(key) DO UPDATE SET value = @value
  `).run({ value: music_folder_path });

  res.json({ music_folder_path });
});

// POST /api/library/scan
router.post('/scan', async (req: Request, res: Response) => {
  const folderSetting = db.prepare("SELECT value FROM settings WHERE key = 'music_folder_path'").get() as { value: string } | undefined;
  const musicFolder = req.body.path || folderSetting?.value;

  if (!musicFolder) {
    return res.status(400).json({ error: 'No music folder configured. Set music_folder_path first.' });
  }

  const status = getScanStatus();
  if (status.isScanning) {
    return res.status(409).json({ error: 'Scan already in progress' });
  }

  // If a new path was provided, save it
  if (req.body.path) {
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('music_folder_path', @value)
      ON CONFLICT(key) DO UPDATE SET value = @value
    `).run({ value: req.body.path });
  }

  try {
    await startScan(musicFolder);
  } catch (err: unknown) {
    const error = err as Error;
    return res.status(400).json({ error: error.message });
  }

  res.json({ message: 'Scan started', folder: musicFolder });
});

// GET /api/library/scan/status
router.get('/scan/status', (_req: Request, res: Response) => {
  const status = getScanStatus();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_songs,
      COUNT(DISTINCT artist) as total_artists,
      COUNT(DISTINCT album) as total_albums
    FROM songs
  `).get() as { total_songs: number; total_artists: number; total_albums: number };

  res.json({ ...status, stats });
});

// GET /api/library/browse?path=/some/dir
router.get('/browse', (req: Request, res: Response) => {
  const requestedPath = (req.query.path as string) || os.homedir();

  let resolvedPath: string;
  try {
    resolvedPath = path.resolve(requestedPath);
    fs.accessSync(resolvedPath, fs.constants.R_OK);
  } catch {
    return res.status(400).json({ error: 'Cannot access directory' });
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
  } catch {
    return res.status(400).json({ error: 'Cannot read directory' });
  }

  const dirs = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => ({ name: e.name, path: path.join(resolvedPath, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const parent = path.dirname(resolvedPath);

  res.json({
    current: resolvedPath,
    parent: parent !== resolvedPath ? parent : null,
    dirs,
  });
});

export default router;
