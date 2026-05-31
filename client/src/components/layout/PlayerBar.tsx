import { useRef, useEffect, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1,
  Volume2, Volume1, VolumeX, Heart, Music2,
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coverUrl, getLiked, likeSong, unlikeSong } from '../../api';
import NowPlayingView from '../player/NowPlayingView';

function formatTime(secs: number) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ProgressBar() {
  const { currentTime, duration, seek } = usePlayerStore();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
      ref.current.style.setProperty('--progress', `${pct}%`);
    }
  }, [currentTime, duration]);

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-xs text-sp-muted w-9 text-right tabular-nums">{formatTime(currentTime)}</span>
      <div className="range-container flex-1">
        <input
          ref={ref}
          type="range"
          min={0}
          max={duration || 1}
          step={0.5}
          value={currentTime}
          onChange={e => seek(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <span className="text-xs text-sp-muted w-9 tabular-nums">{formatTime(duration)}</span>
    </div>
  );
}

function VolumeControl() {
  const { volume, setVolume } = usePlayerStore();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.setProperty('--progress', `${volume * 100}%`);
    }
  }, [volume]);

  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-2 w-32">
      <Icon size={16} className="text-sp-muted flex-shrink-0" />
      <input
        ref={ref}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={e => setVolume(Number(e.target.value))}
        className="volume-slider flex-1"
      />
    </div>
  );
}

export default function PlayerBar() {
  const { currentSong, isPlaying, shuffle, repeat, togglePlay, next, previous, toggleShuffle, toggleRepeat } = usePlayerStore();
  const qc = useQueryClient();
  const [showNowPlaying, setShowNowPlaying] = useState(false);

  const { data: likedData } = useQuery({ queryKey: ['liked'], queryFn: getLiked });
  const likedIds = new Set(likedData?.songs.map(s => s.id) ?? []);

  const likeMut = useMutation({
    mutationFn: (id: number) => likeSong(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liked'] }),
  });

  const unlikeMut = useMutation({
    mutationFn: (id: number) => unlikeSong(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liked'] }),
  });

  const isLiked = currentSong ? likedIds.has(currentSong.id) : false;

  const handleLike = () => {
    if (!currentSong) return;
    if (isLiked) {
      unlikeMut.mutate(currentSong.id);
    } else {
      likeMut.mutate(currentSong.id);
    }
  };

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  return (
    <>
    {showNowPlaying && <NowPlayingView onClose={() => setShowNowPlaying(false)} />}
    <div className="h-[90px] bg-sp-card border-t border-sp-elevated flex items-center px-4 gap-4 flex-shrink-0 m-2 mt-0 rounded-lg">
      {/* Track info */}
      <div className="flex items-center gap-3 w-[30%] min-w-0">
        {currentSong ? (
          <>
            <button
              onClick={() => setShowNowPlaying(true)}
              className="w-14 h-14 flex-shrink-0 rounded overflow-hidden bg-sp-elevated hover:opacity-80 transition-opacity group relative"
              title="Open now playing"
            >
              {currentSong.cover_art ? (
                <img src={coverUrl(currentSong.cover_art)!} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music2 size={24} className="text-sp-faint" />
                </div>
              )}
            </button>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sp-text truncate">{currentSong.title}</p>
              <p className="text-xs text-sp-muted truncate">{currentSong.artist ?? 'Unknown Artist'}</p>
            </div>
            <button
              onClick={handleLike}
              className={`flex-shrink-0 ml-1 transition-colors ${isLiked ? 'text-sp-green' : 'text-sp-muted hover:text-sp-text'}`}
            >
              <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-sp-elevated rounded flex items-center justify-center flex-shrink-0">
              <Music2 size={24} className="text-sp-faint" />
            </div>
            <p className="text-sm text-sp-muted">Nothing playing</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-1 flex-1 max-w-[40%] mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={`transition-colors ${shuffle ? 'text-sp-green' : 'text-sp-muted hover:text-sp-text'}`}
          >
            <Shuffle size={16} />
          </button>

          <button onClick={previous} className="text-sp-muted hover:text-sp-text transition-colors">
            <SkipBack size={20} fill="currentColor" />
          </button>

          <button
            onClick={togglePlay}
            className="w-8 h-8 bg-sp-text rounded-full flex items-center justify-center text-sp-black hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>

          <button onClick={next} className="text-sp-muted hover:text-sp-text transition-colors">
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`transition-colors ${repeat !== 'off' ? 'text-sp-green' : 'text-sp-muted hover:text-sp-text'}`}
          >
            <RepeatIcon size={16} />
          </button>
        </div>

        <ProgressBar />
      </div>

      {/* Volume */}
      <div className="flex items-center justify-end w-[30%]">
        <VolumeControl />
      </div>
    </div>
    </>
  );
}
