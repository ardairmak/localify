import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Music2 } from 'lucide-react';
import { search, getLiked, coverUrl } from '../api';
import { usePlayerStore } from '../store/playerStore';
import SongRow from '../components/library/SongRow';
import Spinner from '../components/ui/Spinner';
import type { Song } from '../types';

export default function Search() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 300);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debouncedQ],
    queryFn: () => search(debouncedQ),
    enabled: debouncedQ.trim().length > 0,
  });
  const { data: likedData } = useQuery({ queryKey: ['liked'], queryFn: getLiked });
  const likedIds = new Set(likedData?.songs.map(s => s.id) ?? []);

  const hasResults = data && (data.songs.length + data.artists.length + data.albums.length > 0);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Search</h1>

      <div className="relative mb-8 max-w-xl">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sp-faint" />
        <input
          type="text"
          placeholder="What do you want to listen to?"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="w-full bg-sp-elevated rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sp-text placeholder-sp-faint"
          autoFocus
        />
        {isFetching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Spinner size={16} />
          </div>
        )}
      </div>

      {!q && (
        <p className="text-sp-muted text-sm">Start typing to search your library</p>
      )}

      {q && !hasResults && !isFetching && (
        <div className="text-center py-16">
          <Music2 size={48} className="text-sp-faint mx-auto mb-4" />
          <p className="font-semibold text-lg">No results for "{q}"</p>
          <p className="text-sp-muted text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {hasResults && (
        <div className="space-y-8">
          {data.songs.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Songs</h2>
              {data.songs.map((song: Song, i: number) => (
                <SongRow key={song.id} song={song} index={i} queue={data.songs} isLiked={likedIds.has(song.id)} showAlbum showCover />
              ))}
            </section>
          )}

          {data.artists.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Artists</h2>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                {data.artists.map(a => (
                  <Link
                    key={a.name}
                    to={`/artists/${encodeURIComponent(a.name)}`}
                    className="group block text-center p-4 bg-sp-elevated hover:bg-sp-hover rounded-lg transition-colors"
                  >
                    <div className="aspect-square rounded-full overflow-hidden bg-sp-card mb-3 flex items-center justify-center">
                      {coverUrl(a.cover_art) ? (
                        <img src={coverUrl(a.cover_art)!} alt={a.name} className="w-full h-full object-cover" />
                      ) : (
                        <Music2 size={32} className="text-sp-faint" />
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate">{a.name}</p>
                    <p className="text-xs text-sp-muted mt-0.5">Artist</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.albums.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Albums</h2>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                {data.albums.map(a => (
                  <Link
                    key={`${a.name}-${a.artist}`}
                    to={`/albums/${encodeURIComponent(a.name)}/${encodeURIComponent(a.artist ?? '')}`}
                    className="group block p-4 bg-sp-elevated hover:bg-sp-hover rounded-lg transition-colors"
                  >
                    <div className="aspect-square rounded overflow-hidden bg-sp-card mb-3 flex items-center justify-center">
                      {coverUrl(a.cover_art) ? (
                        <img src={coverUrl(a.cover_art)!} alt={a.name} className="w-full h-full object-cover" />
                      ) : (
                        <Music2 size={32} className="text-sp-faint" />
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate">{a.name}</p>
                    <p className="text-xs text-sp-muted mt-0.5">{a.artist ?? 'Unknown'}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
