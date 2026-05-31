import { useRef, useEffect, useState, useCallback } from 'react';
import {
  X, Heart, Shuffle, SkipBack, Play, Pause,
  SkipForward, Repeat, Repeat1, Music2, Volume2, Volume1, VolumeX,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlayerStore } from '../../store/playerStore';
import { coverUrl, getLiked, likeSong, unlikeSong } from '../../api';
import NowPlayingView from './NowPlayingView';

const MIN_WIDTH = 280;
const MAX_WIDTH = 560;

function formatTime(secs: number) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function NowPlayingPanel() {
  const {
    currentSong, isPlaying, shuffle, repeat,
    currentTime, duration, volume,
    togglePlay, next, previous, seek, setVolume,
    toggleShuffle, toggleRepeat, toggleNowPlaying,
  } = usePlayerStore();

  const [panelWidth, setPanelWidth] = useState(280);
  const [fullscreen, setFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const qc = useQueryClient();
  const progressRef = useRef<HTMLInputElement>(null);
  const volumeRef = useRef<HTMLInputElement>(null);

  // ── Drag-to-resize ────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
  }, [panelWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      // Dragging left (negative delta) → increase width
      const delta = dragStartX.current - e.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
      setPanelWidth(next);
    };

    const onMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  // ── Range fill sync ───────────────────────────────────────────────────────

  useEffect(() => {
    if (progressRef.current) {
      const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
      progressRef.current.style.setProperty('--progress', `${pct}%`);
    }
  }, [currentTime, duration]);

  useEffect(() => {
    if (volumeRef.current) {
      volumeRef.current.style.setProperty('--progress', `${volume * 100}%`);
    }
  }, [volume]);

  // ── Liked ─────────────────────────────────────────────────────────────────

  const { data: likedData } = useQuery({ queryKey: ['liked'], queryFn: getLiked });
  const isLiked = likedData?.songs.some(s => s.id === currentSong?.id) ?? false;

  const likeMut = useMutation({
    mutationFn: () => likeSong(currentSong!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liked'] }),
  });
  const unlikeMut = useMutation({
    mutationFn: () => unlikeSong(currentSong!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liked'] }),
  });

  const cover = coverUrl(currentSong?.cover_art ?? null);
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <>
      {fullscreen && <NowPlayingView onClose={() => setFullscreen(false)} />}

      {/* Prevent text selection while dragging */}
      {isDragging && (
        <style>{`* { user-select: none !important; cursor: ew-resize !important; }`}</style>
      )}

      <aside
        className="flex-shrink-0 bg-sp-card rounded-lg flex flex-col overflow-hidden relative"
        style={{ width: panelWidth }}
      >
        {/* ── Drag handle ── */}
        <div
          onMouseDown={onMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1 z-10 cursor-ew-resize group"
          title="Drag to resize"
        >
          {/* Visible indicator on hover */}
          <div className="h-full w-full group-hover:bg-sp-green/40 transition-colors rounded-l-lg" />
        </div>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <span className="text-sm font-semibold text-sp-text truncate">Now Playing</span>
          <button onClick={toggleNowPlaying} className="text-sp-muted hover:text-sp-text transition-colors flex-shrink-0 ml-2">
            <X size={18} />
          </button>
        </div>

        {/* ── Cover art ── */}
        <div className="px-4 flex-shrink-0">
          <button
            onClick={() => currentSong && setFullscreen(true)}
            className="w-full aspect-square rounded-lg overflow-hidden bg-sp-elevated block group relative"
            disabled={!currentSong}
          >
            {cover ? (
              <img
                src={cover}
                alt={currentSong?.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 size={64} className="text-sp-faint" />
              </div>
            )}
          </button>
        </div>

        {/* ── Song info + like ── */}
        <div className="px-4 pt-4 flex items-start justify-between gap-2 flex-shrink-0">
          <div className="min-w-0">
            <p className="font-bold text-sp-text text-base truncate leading-snug">
              {currentSong?.title ?? 'Nothing playing'}
            </p>
            <p className="text-sm text-sp-muted truncate mt-0.5">
              {currentSong?.artist ?? '—'}
            </p>
          </div>
          <button
            onClick={() => currentSong && (isLiked ? unlikeMut.mutate() : likeMut.mutate())}
            disabled={!currentSong}
            className={`flex-shrink-0 mt-0.5 transition-colors ${isLiked ? 'text-sp-green' : 'text-sp-muted hover:text-sp-text'}`}
          >
            <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* ── Progress bar ── */}
        <div className="px-4 pt-4 flex-shrink-0">
          <div className="range-container">
            <input
              ref={progressRef}
              type="range"
              min={0}
              max={duration || 1}
              step={0.5}
              value={currentTime}
              onChange={e => seek(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-sp-faint tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-xs text-sp-faint tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="px-4 pt-3 flex items-center justify-between flex-shrink-0">
          <button onClick={toggleShuffle} className={`transition-colors ${shuffle ? 'text-sp-green' : 'text-sp-muted hover:text-sp-text'}`}>
            <Shuffle size={17} />
          </button>
          <button onClick={previous} className="text-sp-muted hover:text-sp-text transition-colors">
            <SkipBack size={22} fill="currentColor" />
          </button>
          <button
            onClick={togglePlay}
            className="w-10 h-10 bg-sp-text rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying
              ? <Pause size={18} fill="black" className="text-black" />
              : <Play size={18} fill="black" className="text-black ml-0.5" />
            }
          </button>
          <button onClick={next} className="text-sp-muted hover:text-sp-text transition-colors">
            <SkipForward size={22} fill="currentColor" />
          </button>
          <button onClick={toggleRepeat} className={`transition-colors ${repeat !== 'off' ? 'text-sp-green' : 'text-sp-muted hover:text-sp-text'}`}>
            <RepeatIcon size={17} />
          </button>
        </div>

        {/* ── Volume ── */}
        <div className="px-4 pt-3 pb-4 flex items-center gap-2 flex-shrink-0">
          <VolumeIcon size={15} className="text-sp-muted flex-shrink-0" />
          <input
            ref={volumeRef}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="volume-slider flex-1"
          />
        </div>
      </aside>
    </>
  );
}
