import { Play, Heart, Music2, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlayerStore } from '../../store/playerStore';
import { coverUrl, likeSong, unlikeSong } from '../../api';
import type { Song } from '../../types';

function formatDuration(secs: number | null) {
  if (!secs) return '--:--';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  song: Song;
  index?: number;
  queue: Song[];
  isLiked: boolean;
  showAlbum?: boolean;
  showCover?: boolean;
}

export default function SongRow({ song, index, queue, isLiked, showAlbum = true, showCover = false }: Props) {
  const [hovered, setHovered] = useState(false);
  const { playSong, currentSong, isPlaying } = usePlayerStore();
  const qc = useQueryClient();
  const isActive = currentSong?.id === song.id;

  const likeMut = useMutation({
    mutationFn: () => likeSong(song.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liked'] }),
  });
  const unlikeMut = useMutation({
    mutationFn: () => unlikeSong(song.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['liked'] }),
  });

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    isLiked ? unlikeMut.mutate() : likeMut.mutate();
  };

  const cover = coverUrl(song.cover_art);

  return (
    <div
      className={`grid items-center px-4 py-2 rounded-md group cursor-pointer transition-colors
        ${isActive ? 'bg-sp-elevated' : 'hover:bg-sp-elevated'}
        ${showAlbum ? 'grid-cols-[auto_1fr_1fr_auto_auto]' : 'grid-cols-[auto_1fr_auto_auto]'}
      `}
      style={{ gap: '12px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={() => playSong(song, queue)}
    >
      {/* Index / play indicator */}
      <div className="w-5 flex items-center justify-center text-sm">
        {hovered ? (
          <button onClick={() => playSong(song, queue)}>
            <Play size={14} fill="white" className="text-white" />
          </button>
        ) : isActive && isPlaying ? (
          <span className="text-sp-green text-xs">♫</span>
        ) : (
          <span className={`tabular-nums ${isActive ? 'text-sp-green' : 'text-sp-muted'}`}>
            {index !== undefined ? index + 1 : ''}
          </span>
        )}
      </div>

      {/* Title + artist */}
      <div className="flex items-center gap-3 min-w-0">
        {showCover && (
          <div className="w-10 h-10 flex-shrink-0 rounded bg-sp-elevated overflow-hidden">
            {cover ? (
              <img src={cover} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 size={16} className="text-sp-faint" />
              </div>
            )}
          </div>
        )}
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-sp-green' : 'text-sp-text'}`}>{song.title}</p>
          <p className="text-xs text-sp-muted truncate">
            <Link
              to={`/artists/${encodeURIComponent(song.artist ?? '')}`}
              onClick={e => e.stopPropagation()}
              className="hover:underline"
            >
              {song.artist ?? 'Unknown Artist'}
            </Link>
          </p>
        </div>
      </div>

      {/* Album */}
      {showAlbum && (
        <div className="min-w-0">
          {song.album ? (
            <Link
              to={`/albums/${encodeURIComponent(song.album)}/${encodeURIComponent(song.artist ?? '')}`}
              onClick={e => e.stopPropagation()}
              className="text-sm text-sp-muted hover:underline hover:text-sp-text truncate block"
            >
              {song.album}
            </Link>
          ) : (
            <span className="text-sm text-sp-muted">—</span>
          )}
        </div>
      )}

      {/* Like */}
      <button
        onClick={handleLike}
        className={`transition-colors ${isLiked ? 'text-sp-green' : 'text-sp-muted opacity-0 group-hover:opacity-100 hover:text-sp-text'}`}
      >
        <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
      </button>

      {/* Duration */}
      <span className="text-sm text-sp-muted tabular-nums">{formatDuration(song.duration)}</span>
    </div>
  );
}
