import { Router, Request, Response } from 'express';
import db from '../db';
import {
  isYtDlpAvailable, startDownload, getJob, getAllJobs, searchYouTube,
} from '../services/downloader';

const router = Router();

// GET /api/download/check
router.get('/check', (_req: Request, res: Response) => {
  res.json({ available: isYtDlpAvailable() });
});

// GET /api/download/search?q=
router.get('/search', async (req: Request, res: Response) => {
  const q = (req.query.q as string ?? '').trim();
  if (!q) return res.json({ results: [] });

  if (!isYtDlpAvailable()) {
    return res.status(503).json({ error: 'yt-dlp not installed' });
  }

  try {
    const results = await searchYouTube(q);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// POST /api/download  { url }
router.post('/', (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  if (!url) return res.status(400).json({ error: 'url is required' });

  if (!isYtDlpAvailable()) {
    return res.status(503).json({ error: 'yt-dlp not installed. Run: brew install yt-dlp ffmpeg' });
  }

  const folderSetting = db.prepare("SELECT value FROM settings WHERE key = 'music_folder_path'").get() as { value: string } | undefined;
  const outputDir = folderSetting?.value;

  if (!outputDir) {
    return res.status(400).json({ error: 'No music folder configured. Set it in Settings first.' });
  }

  const id = startDownload(url, outputDir);
  res.status(202).json({ id });
});

// GET /api/download/status/:id
router.get('/status/:id', (req: Request, res: Response) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// GET /api/download/jobs
router.get('/jobs', (_req: Request, res: Response) => {
  res.json({ jobs: getAllJobs() });
});

export default router;
