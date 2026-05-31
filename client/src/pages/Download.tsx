import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Download, CheckCircle2, AlertCircle,
  Loader2, Music2, Link, X, Play,
} from 'lucide-react';
import {
  checkYtDlp, searchYouTube, startDownload,
  getDownloadStatus, getDownloadJobs,
  type YtSearchResult, type DownloadJob,
} from '../api';
import Spinner from '../components/ui/Spinner';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(secs: number) {
  if (!secs) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

// ── Active download tracker (polls until done) ────────────────────────────────

function ActiveDownload({ id, onDone }: { id: string; onDone: () => void }) {
  const [job, setJob] = useState<DownloadJob | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const j = await getDownloadStatus(id);
        setJob(j);
        if (j.status === 'done' || j.status === 'error') {
          if (!doneRef.current) { doneRef.current = true; onDone(); }
          return;
        }
      } catch {}
      setTimeout(poll, 800);
    };
    poll();
  }, [id, onDone]);

  if (!job) return null;

  const isDone = job.status === 'done';
  const isError = job.status === 'error';

  return (
    <div className="flex items-center gap-4 bg-sp-elevated rounded-xl px-5 py-4">
      <div className="flex-shrink-0">
        {isDone && <CheckCircle2 size={22} className="text-sp-green" />}
        {isError && <AlertCircle size={22} className="text-red-400" />}
        {!isDone && !isError && <Loader2 size={22} className="text-sp-muted animate-spin" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-sp-text truncate">
          {job.title || new URL(job.url).hostname}
        </p>
        <p className="text-xs text-sp-muted mt-0.5 capitalize">
          {isError ? (job.error ?? 'Failed') : isDone ? 'Added to library' : `${job.status}…`}
          {job.status === 'downloading' && job.speed ? ` · ${job.speed}` : ''}
          {job.status === 'downloading' && job.eta ? ` · ETA ${job.eta}` : ''}
        </p>
        {job.status === 'downloading' && (
          <div className="mt-2 h-1 bg-sp-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-sp-green rounded-full transition-all duration-500"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        )}
      </div>

      <span className="text-xs text-sp-faint flex-shrink-0">
        {isDone ? '100%' : isError ? 'Error' : `${job.progress}%`}
      </span>
    </div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({
  result,
  downloading,
  done,
  onDownload,
}: {
  result: YtSearchResult;
  downloading: boolean;
  done: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="flex gap-4 p-4 bg-sp-elevated hover:bg-sp-hover rounded-xl transition-colors group">
      {/* Thumbnail */}
      <div className="relative w-36 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-sp-card">
        <img
          src={result.thumbnail}
          alt={result.title}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {result.duration > 0 && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {fmtDuration(result.duration)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-sp-text line-clamp-2 leading-snug">{result.title}</p>
        <p className="text-xs text-sp-muted mt-1">{result.channel}</p>
        {result.viewCount > 0 && (
          <p className="text-xs text-sp-faint mt-0.5">{fmtViews(result.viewCount)}</p>
        )}
      </div>

      {/* Download button */}
      <div className="flex items-center flex-shrink-0">
        {done ? (
          <div className="flex items-center gap-1.5 text-sp-green text-sm font-semibold">
            <CheckCircle2 size={18} /> Added
          </div>
        ) : downloading ? (
          <div className="flex items-center gap-1.5 text-sp-muted text-sm">
            <Loader2 size={18} className="animate-spin" /> Downloading
          </div>
        ) : (
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 bg-sp-green text-black text-sm font-semibold rounded-full hover:bg-sp-green-hover transition-colors"
          >
            <Download size={15} /> Download
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DownloadPage() {
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [activeJobs, setActiveJobs] = useState<string[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [downloadingUrls, setDownloadingUrls] = useState<Set<string>>(new Set());
  const [urlInput, setUrlInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const { data: ytdlpCheck } = useQuery({ queryKey: ['ytdlp-check'], queryFn: checkYtDlp });

  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ['yt-search', debouncedQ],
    queryFn: () => searchYouTube(debouncedQ),
    enabled: debouncedQ.trim().length > 1 && (ytdlpCheck?.available ?? false),
  });

  const downloadMut = useMutation({
    mutationFn: (url: string) => startDownload(url),
    onSuccess: (data, url) => {
      setActiveJobs(j => [data.id, ...j]);
      setDownloadingUrls(s => { const n = new Set(s); n.add(url); return n; });
    },
  });

  const handleDownload = (url: string) => {
    if (downloadingUrls.has(url) || doneIds.has(url)) return;
    downloadMut.mutate(url);
  };

  const handleUrlDownload = () => {
    const url = urlInput.trim();
    if (!url) return;
    handleDownload(url);
    setUrlInput('');
  };

  const handleJobDone = (jobId: string, url: string) => {
    setDoneIds(s => { const n = new Set(s); n.add(url); return n; });
    setDownloadingUrls(s => { const n = new Set(s); n.delete(url); return n; });
    qc.invalidateQueries({ queryKey: ['songs'] });
    qc.invalidateQueries({ queryKey: ['artists'] });
    qc.invalidateQueries({ queryKey: ['albums'] });
    setTimeout(() => setActiveJobs(j => j.filter(id => id !== jobId)), 5000);
  };

  if (!ytdlpCheck?.available) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-96 text-center gap-4">
        <Music2 size={64} className="text-sp-faint" />
        <h2 className="text-xl font-bold">yt-dlp not found</h2>
        <p className="text-sp-muted max-w-sm text-sm">
          Localify uses <code className="bg-sp-elevated px-1 py-0.5 rounded text-sp-text">yt-dlp</code> and{' '}
          <code className="bg-sp-elevated px-1 py-0.5 rounded text-sp-text">ffmpeg</code> to download and convert YouTube videos.
          Install them with Homebrew:
        </p>
        <div className="bg-sp-elevated rounded-xl px-6 py-4 font-mono text-sm text-sp-text">
          brew install yt-dlp ffmpeg
        </div>
        <p className="text-xs text-sp-faint">Then restart Localify's server.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Download</h1>
        <p className="text-sp-muted text-sm">Search YouTube or paste a URL — downloads as MP3 directly into your library</p>
      </div>

      {/* Active downloads */}
      {activeJobs.length > 0 && (
        <div className="mb-6 space-y-2">
          {activeJobs.map(id => {
            const job = searchData?.results?.find(r => downloadingUrls.has(r.url));
            return (
              <ActiveDownload
                key={id}
                id={id}
                onDone={() => {
                  // find the url for this job to mark done
                  getDownloadStatus(id).then(j => handleJobDone(id, j.url));
                }}
              />
            );
          })}
        </div>
      )}

      {/* Paste URL */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Link size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-sp-faint" />
          <input
            type="url"
            placeholder="Paste YouTube URL…"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUrlDownload()}
            className="w-full bg-sp-elevated border border-sp-faint rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-sp-text transition-colors"
          />
        </div>
        <button
          onClick={handleUrlDownload}
          disabled={!urlInput.trim() || downloadMut.isPending}
          className="flex items-center gap-2 px-5 py-3 bg-sp-green text-black font-semibold rounded-xl hover:bg-sp-green-hover transition-colors disabled:opacity-50 text-sm"
        >
          <Download size={16} /> Download
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sp-faint" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search YouTube…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-sp-elevated rounded-xl pl-12 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sp-text placeholder-sp-faint transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sp-faint hover:text-sp-muted"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Results */}
      {searching && (
        <div className="flex items-center gap-3 py-8 justify-center text-sp-muted text-sm">
          <Spinner size={18} /> Searching YouTube…
        </div>
      )}

      {!searching && debouncedQ && searchData?.results?.length === 0 && (
        <p className="text-center text-sp-muted py-12 text-sm">No results for "{debouncedQ}"</p>
      )}

      {!searching && searchData?.results && searchData.results.length > 0 && (
        <div className="space-y-2">
          {searchData.results.map(result => (
            <ResultCard
              key={result.id}
              result={result}
              downloading={downloadingUrls.has(result.url)}
              done={doneIds.has(result.url)}
              onDownload={() => handleDownload(result.url)}
            />
          ))}
        </div>
      )}

      {!debouncedQ && !activeJobs.length && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-sp-elevated flex items-center justify-center">
            <Play size={28} className="text-sp-faint ml-1" />
          </div>
          <p className="font-semibold text-sp-text">Find music on YouTube</p>
          <p className="text-sm text-sp-muted">Type an artist, song, or album — or paste a URL above</p>
        </div>
      )}
    </div>
  );
}
