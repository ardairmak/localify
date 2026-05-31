import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play, Music2 } from 'lucide-react';
import { getAlbums, getArtists, coverUrl, getAlbum } from '../api';
import { usePlayerStore } from '../store/playerStore';
import Spinner from '../components/ui/Spinner';
import type { Album, Artist } from '../types';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function SmallCard({ album }: { album: Album }) {
  const playQueue = usePlayerStore(s => s.playQueue);

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const data = await getAlbum(album.name, album.artist ?? '');
      if (data.songs.length > 0) playQueue(data.songs, 0);
    } catch {}
  };

  const href = `/albums/${encodeURIComponent(album.name)}/${encodeURIComponent(album.artist ?? '')}`;

  return (
    <Link
      to={href}
      className="flex items-center gap-3 bg-sp-elevated hover:bg-[#3a3a3a] transition-colors rounded overflow-hidden group cursor-pointer"
    >
      <div className="w-16 h-16 flex-shrink-0 bg-sp-faint">
        {coverUrl(album.cover_art) ? (
          <img src={coverUrl(album.cover_art)!} alt={album.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={24} className="text-sp-faint" />
          </div>
        )}
      </div>
      <span className="text-sm font-semibold text-sp-text truncate pr-2 flex-1">{album.name}</span>
      <button
        onClick={handlePlay}
        className="mr-4 w-10 h-10 bg-sp-green rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      >
        <Play size={16} fill="black" className="text-black ml-0.5" />
      </button>
    </Link>
  );
}

function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-sp-text">{title}</h2>
      <Link to={to} className="text-sm text-sp-muted hover:text-sp-text font-semibold transition-colors">
        Show all
      </Link>
    </div>
  );
}

export default function Home() {
  const albums = useQuery({ queryKey: ['albums'], queryFn: getAlbums });
  const artists = useQuery({ queryKey: ['artists'], queryFn: getArtists });

  const recentAlbums = albums.data?.albums.slice(0, 6) ?? [];
  const topArtists = artists.data?.artists.slice(0, 6) ?? [];
  const quickAlbums = albums.data?.albums.slice(0, 8) ?? [];

  return (
    <div className="p-6">
      {/* Gradient header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-sp-text">{greeting()}</h1>
      </div>

      {/* Quick access grid */}
      {quickAlbums.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-8">
          {quickAlbums.map(a => (
            <SmallCard key={`${a.name}-${a.artist}`} album={a} />
          ))}
        </div>
      )}

      {/* Recent albums */}
      {albums.isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : recentAlbums.length > 0 ? (
        <section className="mb-8">
          <SectionHeader title="Albums" to="/albums" />
          <div className="grid grid-cols-3 gap-4 xl:grid-cols-4 2xl:grid-cols-6">
            {recentAlbums.map(album => (
              <Link
                key={`${album.name}-${album.artist}`}
                to={`/albums/${encodeURIComponent(album.name)}/${encodeURIComponent(album.artist ?? '')}`}
                className="group block"
              >
                <div className="aspect-square rounded overflow-hidden bg-sp-elevated mb-3">
                  {coverUrl(album.cover_art) ? (
                    <img src={coverUrl(album.cover_art)!} alt={album.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 size={40} className="text-sp-faint" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold text-sp-text truncate">{album.name}</p>
                <p className="text-xs text-sp-muted truncate mt-0.5">{album.artist ?? 'Unknown'}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Artists */}
      {topArtists.length > 0 && (
        <section>
          <SectionHeader title="Artists" to="/artists" />
          <div className="grid grid-cols-3 gap-4 xl:grid-cols-4 2xl:grid-cols-6">
            {topArtists.map((artist: Artist) => (
              <Link
                key={artist.name}
                to={`/artists/${encodeURIComponent(artist.name)}`}
                className="group block text-center"
              >
                <div className="aspect-square rounded-full overflow-hidden bg-sp-elevated mb-3">
                  {coverUrl(artist.cover_art) ? (
                    <img src={coverUrl(artist.cover_art)!} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 size={40} className="text-sp-faint" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold text-sp-text truncate">{artist.name}</p>
                <p className="text-xs text-sp-muted mt-0.5">Artist</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {albums.data?.albums.length === 0 && artists.data?.artists.length === 0 && (
        <div className="text-center py-20">
          <Music2 size={64} className="text-sp-faint mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Your library is empty</h2>
          <p className="text-sp-muted mb-4">Go to Settings to add your music folder</p>
          <Link to="/settings" className="bg-sp-green text-black font-semibold px-6 py-2 rounded-full hover:bg-sp-green-hover transition-colors">
            Open Settings
          </Link>
        </div>
      )}
    </div>
  );
}
