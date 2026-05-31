import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Play, Users, Music2 } from 'lucide-react';
import { getArtist, getLiked, coverUrl, getAlbum } from '../api';
import { usePlayerStore } from '../store/playerStore';
import SongList from '../components/library/SongList';
import Spinner from '../components/ui/Spinner';

export default function ArtistDetail() {
  const { name } = useParams<{ name: string }>();
  const artistName = decodeURIComponent(name ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['artist', artistName],
    queryFn: () => getArtist(artistName),
    enabled: !!artistName,
  });
  const { data: likedData } = useQuery({ queryKey: ['liked'], queryFn: getLiked });
  const likedIds = new Set(likedData?.songs.map(s => s.id) ?? []);
  const playQueue = usePlayerStore(s => s.playQueue);

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size={40} /></div>;
  if (!data) return <div className="p-6 text-sp-muted">Artist not found</div>;

  const cover = coverUrl(data.albums[0]?.cover_art ?? null);

  return (
    <div>
      {/* Header */}
      <div className="relative h-64 flex items-end p-6 bg-gradient-to-b from-sp-elevated to-sp-card">
        <div className="flex items-end gap-6">
          <div className="w-40 h-40 rounded-full overflow-hidden bg-sp-elevated flex items-center justify-center shadow-2xl flex-shrink-0">
            {cover ? (
              <img src={cover} alt={artistName} className="w-full h-full object-cover" />
            ) : (
              <Users size={64} className="text-sp-faint" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-sp-muted uppercase tracking-widest mb-2">Artist</p>
            <h1 className="text-5xl font-black mb-4">{artistName}</h1>
            <p className="text-sp-muted text-sm">{data.songs.length} songs</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Play button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => playQueue(data.songs, 0)}
            className="w-14 h-14 bg-sp-green rounded-full flex items-center justify-center hover:bg-sp-green-hover transition-colors shadow"
          >
            <Play size={24} fill="black" className="text-black ml-1" />
          </button>
        </div>

        {/* Songs */}
        <h2 className="text-xl font-bold mb-4">Popular</h2>
        <SongList songs={data.songs} likedIds={likedIds} showAlbum showCover />

        {/* Albums */}
        {data.albums.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">Albums</h2>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              {data.albums.map(album => (
                <Link
                  key={album.album}
                  to={`/albums/${encodeURIComponent(album.album)}/${encodeURIComponent(artistName)}`}
                  className="group block bg-sp-elevated hover:bg-sp-hover rounded-lg p-4 transition-colors"
                >
                  <div className="aspect-square rounded overflow-hidden bg-sp-card mb-3 relative">
                    {coverUrl(album.cover_art) ? (
                      <img src={coverUrl(album.cover_art)!} alt={album.album} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={32} className="text-sp-faint" />
                      </div>
                    )}
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        const d = await getAlbum(album.album, artistName);
                        if (d.songs.length) playQueue(d.songs, 0);
                      }}
                      className="absolute bottom-2 right-2 w-10 h-10 bg-sp-green rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play size={16} fill="black" className="text-black ml-0.5" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-sp-text truncate">{album.album}</p>
                  <p className="text-xs text-sp-muted mt-0.5">{album.year ?? 'Album'}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
