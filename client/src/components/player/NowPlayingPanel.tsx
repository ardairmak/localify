import { useRef, useEffect, useState, useCallback } from 'react';
import { X, Heart, Music2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlayerStore } from '../../store/playerStore';
import { coverUrl, getLiked, likeSong, unlikeSong } from '../../api';
import NowPlayingView from './NowPlayingView';

const MIN_WIDTH = 280;
const MAX_WIDTH = 560;

export default function NowPlayingPanel() {
  const { currentSong, toggleNowPlaying } = usePlayerStore();

  const [panelWidth, setPanelWidth] = useState(280);
  const [fullscreen, setFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const qc = useQueryClient();

  // ── Drag-to-resize ────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
  }, [panelWidth]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const delta = dragStartX.current - e.clientX;
      setPanelWidth(w => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta)));
    };
    const onUp = () => setIsDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

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

  return (
    <>
      {fullscreen && <NowPlayingView onClose={() => setFullscreen(false)} />}

      {isDragging && (
        <style>{`* { user-select: none !important; cursor: ew-resize !important; }`}</style>
      )}

      <aside
        className="flex-shrink-0 bg-sp-card rounded-lg flex flex-col overflow-hidden relative"
        style={{ width: panelWidth }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={onMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1 z-10 cursor-ew-resize group"
        >
          <div className="h-full w-full group-hover:bg-sp-green/40 transition-colors rounded-l-lg" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <span className="text-sm font-semibold text-sp-text truncate">Now Playing</span>
          <button onClick={toggleNowPlaying} className="text-sp-muted hover:text-sp-text transition-colors flex-shrink-0 ml-2">
            <X size={18} />
          </button>
        </div>

        {/* Cover art — click to open fullscreen */}
        <div className="px-4 flex-shrink-0">
          <button
            onClick={() => currentSong && setFullscreen(true)}
            disabled={!currentSong}
            className="w-full aspect-square rounded-lg overflow-hidden bg-sp-elevated block group"
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

        {/* Song info + like */}
        <div className="px-4 pt-5 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <p className="font-bold text-sp-text text-base truncate leading-snug">
              {currentSong?.title ?? 'Nothing playing'}
            </p>
            <p className="text-sm text-sp-muted truncate mt-1">
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
      </aside>
    </>
  );
}
