import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ListMusic, Trash2, Edit2 } from 'lucide-react';
import { getPlaylist, getLiked, deletePlaylist, updatePlaylist } from '../api';
import { usePlayerStore } from '../store/playerStore';
import SongList from '../components/library/SongList';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const playQueue = usePlayerStore(s => s.playQueue);

  const { data, isLoading } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => getPlaylist(Number(id)),
    enabled: !!id,
  });
  const { data: likedData } = useQuery({ queryKey: ['liked'], queryFn: getLiked });
  const likedIds = new Set(likedData?.songs.map(s => s.id) ?? []);

  const deleteMut = useMutation({
    mutationFn: () => deletePlaylist(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists'] });
      navigate('/playlists');
    },
  });

  const renameMut = useMutation({
    mutationFn: () => updatePlaylist(Number(id), { name: name.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlist', id] });
      qc.invalidateQueries({ queryKey: ['playlists'] });
      setEditing(false);
    },
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size={40} /></div>;
  if (!data) return <div className="p-6 text-sp-muted">Playlist not found</div>;

  const startEdit = () => { setName(data.name); setEditing(true); };

  return (
    <div>
      <div className="flex items-end gap-6 p-6 pb-4 bg-gradient-to-b from-sp-elevated to-sp-card">
        <div className="w-48 h-48 flex-shrink-0 rounded bg-sp-elevated flex items-center justify-center shadow-2xl">
          <ListMusic size={64} className="text-sp-faint" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-sp-muted uppercase tracking-widest mb-2">Playlist</p>
          {editing ? (
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-sp-hover border border-sp-faint rounded-md px-3 py-2 text-2xl font-bold focus:outline-none focus:border-sp-text flex-1"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') renameMut.mutate(); if (e.key === 'Escape') setEditing(false); }}
              />
              <button
                onClick={() => renameMut.mutate()}
                className="px-4 py-2 bg-sp-green text-black rounded-full text-sm font-semibold hover:bg-sp-green-hover"
              >
                Save
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-full text-sm text-sp-muted hover:text-sp-text">
                Cancel
              </button>
            </div>
          ) : (
            <h1 className="text-4xl font-black mb-3 leading-tight truncate">{data.name}</h1>
          )}
          <p className="text-sp-muted text-sm">{data.tracks.length} songs</p>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => data.tracks.length && playQueue(data.tracks, 0)}
            disabled={!data.tracks.length}
            className="w-14 h-14 bg-sp-green rounded-full flex items-center justify-center hover:bg-sp-green-hover transition-colors shadow disabled:opacity-50"
          >
            <Play size={24} fill="black" className="text-black ml-1" />
          </button>
          <button
            onClick={startEdit}
            className="text-sp-muted hover:text-sp-text transition-colors p-2"
            title="Rename"
          >
            <Edit2 size={20} />
          </button>
          <button
            onClick={() => { if (confirm(`Delete "${data.name}"?`)) deleteMut.mutate(); }}
            className="text-sp-muted hover:text-red-500 transition-colors p-2"
            title="Delete playlist"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {data.tracks.length === 0 ? (
          <EmptyState title="No songs yet" description="Add songs from the library" />
        ) : (
          <SongList songs={data.tracks} likedIds={likedIds} showAlbum showCover />
        )}
      </div>
    </div>
  );
}
