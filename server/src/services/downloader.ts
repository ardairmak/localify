import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface DownloadJob {
  id: string;
  url: string;
  status: 'queued' | 'downloading' | 'converting' | 'scanning' | 'done' | 'error';
  progress: number;
  speed: string;
  eta: string;
  title: string;
  filename: string | null;
  error: string | null;
  startedAt: string;
}

export interface SearchResult {
  id: string;
  title: string;
  channel: string;
  duration: number;
  thumbnail: string;
  url: string;
  viewCount: number;
}

const jobs = new Map<string, DownloadJob>();

export function getJob(id: string): DownloadJob | undefined {
  return jobs.get(id);
}

export function getAllJobs(): DownloadJob[] {
  return Array.from(jobs.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 50);
}

export function isYtDlpAvailable(): boolean {
  try {
    const { execSync } = require('child_process');
    execSync('yt-dlp --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function startDownload(url: string, outputDir: string): string {
  const id = crypto.randomUUID();
  const job: DownloadJob = {
    id, url,
    status: 'queued',
    progress: 0,
    speed: '',
    eta: '',
    title: '',
    filename: null,
    error: null,
    startedAt: new Date().toISOString(),
  };
  jobs.set(id, job);
  fs.mkdirSync(outputDir, { recursive: true });
  runDownload(job, outputDir);
  return id;
}

async function runDownload(job: DownloadJob, outputDir: string) {
  job.status = 'downloading';

  // Snapshot existing mp3s so we can detect the newly created one
  const existingMp3s = new Set(
    fs.readdirSync(outputDir)
      .filter(f => f.toLowerCase().endsWith('.mp3'))
      .map(f => path.join(outputDir, f))
  );

  const outputTemplate = path.join(outputDir, '%(uploader)s - %(title)s.%(ext)s');

  const proc = spawn('yt-dlp', [
    job.url,
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '--embed-thumbnail',
    '--add-metadata',
    '--no-playlist',
    '--no-warnings',
    '-o', outputTemplate,
    '--newline',
  ]);

  let capturedPath: string | null = null;

  const parseLine = (line: string) => {
    // Progress: [download]   45.3% of    3.27MiB at    1.23MiB/s ETA 00:01
    const pMatch = line.match(/\[download\]\s+([\d.]+)%\s+of\s+[\d.]+\S+\s+at\s+([\S]+)\s+ETA\s+(\S+)/);
    if (pMatch) {
      job.progress = Math.min(95, parseFloat(pMatch[1]));
      job.speed = pMatch[2];
      job.eta = pMatch[3];
    }

    // Download destination (the .webm/.m4a file before conversion)
    const dlDest = line.match(/\[download\] Destination:\s+(.+)/);
    if (dlDest) capturedPath = dlDest[1].trim();

    // ExtractAudio destination — this is the FINAL mp3 path (yt-dlp logs "[ExtractAudio]" not "[ffmpeg]")
    const extractDest = line.match(/\[(?:ExtractAudio|ffmpeg|AudioConvert)\] Destination:\s+(.+)/);
    if (extractDest) {
      job.status = 'converting';
      job.progress = 96;
      capturedPath = extractDest[1].trim();
    }

    // Already downloaded
    const alreadyDl = line.match(/\[download\] (.+) has already been downloaded/);
    if (alreadyDl) capturedPath = alreadyDl[1].trim();

    // Grab title from video info
    if (!job.title) {
      const infoMatch = line.match(/\[info\] ([^:]+): Downloading/);
      if (infoMatch) job.title = infoMatch[1];
    }
  };

  proc.stdout.on('data', (d: Buffer) => d.toString().split('\n').forEach(parseLine));
  proc.stderr.on('data', (d: Buffer) => {
    const txt = d.toString();
    if (/error/i.test(txt)) job.error = (job.error ? job.error + '\n' : '') + txt.trim();
    // stderr also carries some progress lines in newer yt-dlp versions
    txt.split('\n').forEach(parseLine);
  });

  proc.on('close', async (code) => {
    if (code !== 0) {
      job.status = 'error';
      if (!job.error) job.error = `yt-dlp exited with code ${code}`;
      return;
    }

    // Prefer the captured path; fall back to finding any new .mp3 in outputDir
    let finalPath = capturedPath && fs.existsSync(capturedPath) ? capturedPath : null;

    if (!finalPath) {
      const newMp3s = fs.readdirSync(outputDir)
        .filter(f => f.toLowerCase().endsWith('.mp3'))
        .map(f => path.join(outputDir, f))
        .filter(f => !existingMp3s.has(f));
      finalPath = newMp3s[0] ?? null;
    }

    if (!finalPath) {
      job.status = 'error';
      job.error = 'Download completed but output file not found';
      return;
    }

    job.status = 'scanning';
    job.filename = finalPath;
    try {
      const { processSingleFile } = await import('./scanner');
      await processSingleFile(finalPath);
    } catch (err) {
      console.error('Auto-scan failed:', err);
    }
    job.status = 'done';
    job.progress = 100;
  });
}

export async function searchYouTube(query: string): Promise<SearchResult[]> {
  return new Promise((resolve) => {
    const proc = spawn('yt-dlp', [
      `ytsearch15:${query}`,
      '--flat-playlist',
      '--dump-json',
      '--no-download',
      '--no-warnings',
    ]);

    const results: SearchResult[] = [];
    let buf = '';

    proc.stdout.on('data', (d: Buffer) => {
      buf += d.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const o = JSON.parse(line);
          if (o.id) {
            results.push({
              id: o.id,
              title: o.title ?? 'Unknown',
              channel: o.channel ?? o.uploader ?? 'Unknown',
              duration: o.duration ?? 0,
              thumbnail: o.thumbnail ?? `https://i.ytimg.com/vi/${o.id}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${o.id}`,
              viewCount: o.view_count ?? 0,
            });
          }
        } catch { /* skip malformed lines */ }
      }
    });

    const timer = setTimeout(() => { proc.kill(); resolve(results); }, 20000);
    proc.on('close', () => { clearTimeout(timer); resolve(results); });
  });
}

export function formatDuration(secs: number): string {
  if (!secs) return '--:--';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
