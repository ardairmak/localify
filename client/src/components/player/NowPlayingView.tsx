import { useEffect, useRef } from 'react';
import {
  X, Shuffle, SkipBack, Play, Pause, SkipForward,
  Repeat, Repeat1, Heart, Volume2, Volume1, VolumeX, ChevronDown,
  Music2,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlayerStore } from '../../store/playerStore';
import { coverUrl, getLiked, likeSong, unlikeSong } from '../../api';

function formatTime(secs: number) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  onClose: () => void;
}

export default function NowPlayingView({ onClose }: Props) {
  const {
    currentSong, isPlaying, shuffle, repeat,
    currentTime, duration, volume,
    togglePlay, next, previous, seek, setVolume,
    toggleShuffle, toggleRepeat,
  } = usePlayerStore();

  const qc = useQueryClient();
  const progressRef = useRef<HTMLInputElement>(null);
  const volumeRef = useRef<HTMLInputElement>(null);

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

  // Sync range fill
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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const cover = coverUrl(currentSong?.cover_art ?? null);
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden">
      {/* Blurred background */}
      <div className="absolute inset-0">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'blur(60px) brightness(0.35)', transform: 'scale(1.15)' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e]" />
        )}
      </div>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ChevronDown size={24} />
          </button>
          <p className="text-sm font-semibold text-white/70 uppercase tracking-widest">Now Playing</p>
          <div className="w-8" /> {/* spacer */}
        </div>

        {/* Main area — art + info + controls */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8 pb-8">
          {/* Album art */}
          <div
            className="rounded-2xl overflow-hidden shadow-2xl flex-shrink-0"
            style={{
              width: 'min(340px, 60vw)',
              height: 'min(340px, 60vw)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
            }}
          >
            {cover ? (
              <img src={cover} alt={currentSong?.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-sp-elevated flex items-center justify-center">
                <Music2 size={80} className="text-sp-faint" />
              </div>
            )}
          </div>

          {/* Song info + like */}
          <div className="flex items-center justify-between w-full max-w-sm">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white truncate leading-tight">
                {currentSong?.title ?? 'Nothing playing'}
              </h1>
              <p className="text-white/60 mt-1 truncate">
                {currentSong?.artist ?? '—'}
              </p>
            </div>
            <button
              onClick={() => currentSong && (isLiked ? unlikeMut.mutate() : likeMut.mutate())}
              disabled={!currentSong}
              className={`ml-4 flex-shrink-0 transition-colors ${isLiked ? 'text-sp-green' : 'text-white/50 hover:text-white'}`}
            >
              <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-sm">
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
                style={{ '--track-fill': '#fff' } as React.CSSProperties}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-white/50 tabular-nums">{formatTime(currentTime)}</span>
              <span className="text-xs text-white/50 tabular-nums">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Transport controls */}
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={toggleShuffle}
              className={`transition-colors ${shuffle ? 'text-sp-green' : 'text-white/50 hover:text-white'}`}
            >
              <Shuffle size={20} />
            </button>

            <button onClick={previous} className="text-white hover:scale-110 transition-transform">
              <SkipBack size={28} fill="currentColor" />
            </button>

            <button
              onClick={togglePlay}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
            >
              {isPlaying
                ? <Pause size={28} fill="black" className="text-black" />
                : <Play size={28} fill="black" className="text-black ml-1" />
              }
            </button>

            <button onClick={next} className="text-white hover:scale-110 transition-transform">
              <SkipForward size={28} fill="currentColor" />
            </button>

            <button
              onClick={toggleRepeat}
              className={`transition-colors ${repeat !== 'off' ? 'text-sp-green' : 'text-white/50 hover:text-white'}`}
            >
              <RepeatIcon size={20} />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <VolumeIcon size={18} className="text-white/50 flex-shrink-0" />
            <input
              ref={volumeRef}
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="volume-slider flex-1"
              style={{ '--track-fill': '#fff' } as React.CSSProperties}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
