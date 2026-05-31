import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ListMusic } from 'lucide-react';
import { getPlaylists, createPlaylist } from '../api';
import Spinner from '../components/ui/Spinner';

function CreateModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: () => createPlaylist({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playlists'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-sp-elevated rounded-xl p-8 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6">Create playlist</h2>
        <input
          type="text"
          placeholder="Playlist name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-sp-hover border border-sp-faint rounded-md px-4 py-3 text-sm mb-3 focus:outline-none focus:border-sp-text"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && name.trim() && mut.mutate()}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full bg-sp-hover border border-sp-faint rounded-md px-4 py-3 text-sm mb-6 focus:outline-none focus:border-sp-text"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-6 py-2 rounded-full text-sm font-semibold text-sp-text hover:bg-sp-hover transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!name.trim() || mut.isPending}
            className="px-6 py-2 rounded-full text-sm font-semibold bg-sp-green text-black hover:bg-sp-green-hover transition-colors disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Playlists() {
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['playlists'], queryFn: getPlaylists });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Playlists</h1>
          {data && <p className="text-sp-muted text-sm mt-1">{data.playlists.length} playlists</p>}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-sp-green text-black font-semibold px-4 py-2 rounded-full hover:bg-sp-green-hover transition-colors text-sm"
        >
          <Plus size={16} /> New playlist
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner size={40} /></div>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data?.playlists.map(pl => (
            <Link
              key={pl.id}
              to={`/playlists/${pl.id}`}
              className="bg-sp-elevated hover:bg-sp-hover rounded-lg p-4 transition-colors group block"
            >
              <div className="aspect-square rounded bg-sp-card flex items-center justify-center mb-3">
                <ListMusic size={40} className="text-sp-faint" />
              </div>
              <p className="text-sm font-semibold text-sp-text truncate">{pl.name}</p>
              <p className="text-xs text-sp-muted mt-0.5">{pl.track_count} songs</p>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && data?.playlists.length === 0 && (
        <div className="text-center py-20">
          <ListMusic size={64} className="text-sp-faint mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Create your first playlist</h2>
          <p className="text-sp-muted mb-4">It's easy, we'll help you</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-sp-green text-black font-semibold px-6 py-2 rounded-full hover:bg-sp-green-hover transition-colors text-sm"
          >
            Create playlist
          </button>
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
