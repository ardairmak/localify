import { Play, Heart, Music2, Pencil, MoreHorizontal, Plus, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlayerStore } from '../../store/playerStore';
import { coverUrl, likeSong, unlikeSong, getPlaylists, addToPlaylist } from '../../api';
import type { Song } from '../../types';
import SongEditor from '../ui/SongEditor';

function formatDuration(secs: number | null) {
  if (!secs) return '--:--';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function AddToPlaylistMenu({ song, onClose }: { song: Song; onClose: () => void }) {
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const [added, setAdded] = useState<number | null>(null);

  const { data } = useQuery({ queryKey: ['playlists'], queryFn: getPlaylists });

  const addMut = useMutation({
    mutationFn: (playlistId: number) => addToPlaylist(playlistId, song.id),
    onSuccess: (_, playlistId) => {
      qc.invalidateQueries({ queryKey: ['playlist', String(playlistId)] });
      setAdded(playlistId);
      setTimeout(onClose, 800);
    },
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-sp-elevated border border-sp-hover rounded-lg shadow-2xl py-1 min-w-[200px] max-w-[260px]"
      onClick={e => e.stopPropagation()}
    >
      <p className="px-4 py-2 text-xs font-semibold text-sp-faint uppercase tracking-wider">Add to playlist</p>

      {data?.playlists.length === 0 && (
        <p className="px-4 py-2 text-sm text-sp-muted">No playlists yet</p>
      )}

      {data?.playlists.map(pl => (
        <button
          key={pl.id}
          onClick={() => !addMut.isPending && addMut.mutate(pl.id)}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-sp-text hover:bg-sp-hover transition-colors text-left"
        >
          {added === pl.id ? (
            <Check size={14} className="text-sp-green flex-shrink-0" />
          ) : (
            <Plus size={14} className="text-sp-muted flex-shrink-0" />
          )}
          <span className="truncate">{pl.name}</span>
        </button>
      ))}
    </div>
  );
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
  const [editing, setEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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
      className={`grid items-center px-4 py-2 rounded-md group cursor-pointer transition-colors relative
        ${isActive ? 'bg-sp-elevated' : 'hover:bg-sp-elevated'}
        ${showAlbum ? 'grid-cols-[auto_1fr_1fr_auto_auto]' : 'grid-cols-[auto_1fr_auto_auto]'}
      `}
      style={{ gap: '12px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
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

      {/* Actions: like + edit + more */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleLike}
          className={`p-1 transition-colors ${isLiked ? 'text-sp-green' : 'text-sp-muted opacity-0 group-hover:opacity-100 hover:text-sp-text'}`}
        >
          <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); setEditing(true); }}
          className="p-1 text-sp-muted opacity-0 group-hover:opacity-100 hover:text-sp-text transition-colors"
          title="Edit info"
        >
          <Pencil size={13} />
        </button>
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
            className="p-1 text-sp-muted opacity-0 group-hover:opacity-100 hover:text-sp-text transition-colors"
            title="More options"
          >
            <MoreHorizontal size={15} />
          </button>
          {showMenu && (
            <AddToPlaylistMenu song={song} onClose={() => setShowMenu(false)} />
          )}
        </div>
      </div>

      {/* Duration */}
      <span className="text-sm text-sp-muted tabular-nums">{formatDuration(song.duration)}</span>

      {editing && <SongEditor song={song} onClose={() => setEditing(false)} />}
    </div>
  );
}
