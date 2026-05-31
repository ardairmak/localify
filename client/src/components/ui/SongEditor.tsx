import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Music2 } from 'lucide-react';
import { updateSong, coverUrl } from '../../api';
import type { Song } from '../../types';
import Spinner from './Spinner';

interface Props {
  song: Song;
  onClose: () => void;
}

export default function SongEditor({ song, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: song.title ?? '',
    artist: song.artist ?? '',
    album: song.album ?? '',
    year: song.year ? String(song.year) : '',
    genre: song.genre ?? '',
  });

  const mut = useMutation({
    mutationFn: () =>
      updateSong(song.id, {
        title: form.title.trim() || undefined,
        artist: form.artist.trim() || null,
        album: form.album.trim() || null,
        year: form.year ? Number(form.year) : null,
        genre: form.genre.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['songs'] });
      qc.invalidateQueries({ queryKey: ['artists'] });
      qc.invalidateQueries({ queryKey: ['albums'] });
      qc.invalidateQueries({ queryKey: ['liked'] });
      onClose();
    },
  });

  const field = (key: keyof typeof form, label: string, placeholder = '') => (
    <div>
      <label className="block text-xs font-semibold text-sp-muted uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type="text"
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-sp-hover border border-sp-faint rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-sp-text transition-colors"
      />
    </div>
  );

  const cover = coverUrl(song.cover_art);

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-sp-elevated rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-hover">
          <h2 className="font-bold text-base">Edit Song Info</h2>
          <button onClick={onClose} className="text-sp-muted hover:text-sp-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Cover + filename */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-sp-hover">
          <div className="w-14 h-14 flex-shrink-0 rounded overflow-hidden bg-sp-hover">
            {cover ? (
              <img src={cover} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 size={24} className="text-sp-faint" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-sp-faint truncate">{song.file_path.split('/').pop()}</p>
            <p className="text-xs text-sp-faint mt-0.5">{song.format} · {song.bitrate ? `${song.bitrate} kbps` : '—'}</p>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {field('title', 'Title')}
          {field('artist', 'Artist')}
          {field('album', 'Album')}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-sp-muted uppercase tracking-wider mb-1.5">Year</label>
              <input
                type="number"
                value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                placeholder="2024"
                min={1900}
                max={2099}
                className="w-full bg-sp-hover border border-sp-faint rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-sp-text transition-colors"
              />
            </div>
            <div>
              {field('genre', 'Genre', 'Hip-Hop')}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-sp-hover">
          <button onClick={onClose} className="px-5 py-2 rounded-full text-sm text-sp-muted hover:text-sp-text transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={!form.title.trim() || mut.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-sp-green text-black font-semibold rounded-full text-sm hover:bg-sp-green-hover transition-colors disabled:opacity-50"
          >
            {mut.isPending ? <Spinner size={14} /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
