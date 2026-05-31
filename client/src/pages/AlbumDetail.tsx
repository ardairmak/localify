import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Play, Disc3, Music2 } from 'lucide-react';
import { getAlbum, getLiked, coverUrl } from '../api';
import { usePlayerStore } from '../store/playerStore';
import SongList from '../components/library/SongList';
import Spinner from '../components/ui/Spinner';

function totalDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
}

export default function AlbumDetail() {
  const { album: albumParam, artist: artistParam } = useParams<{ album: string; artist: string }>();
  const albumName = decodeURIComponent(albumParam ?? '');
  const artistName = decodeURIComponent(artistParam ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['album', albumName, artistName],
    queryFn: () => getAlbum(albumName, artistName),
    enabled: !!albumName,
  });
  const { data: likedData } = useQuery({ queryKey: ['liked'], queryFn: getLiked });
  const likedIds = new Set(likedData?.songs.map(s => s.id) ?? []);
  const playQueue = usePlayerStore(s => s.playQueue);

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size={40} /></div>;
  if (!data) return <div className="p-6 text-sp-muted">Album not found</div>;

  const cover = coverUrl(data.songs[0]?.cover_art ?? null);
  const year = data.songs[0]?.year;
  const artist = data.songs[0]?.album_artist ?? data.songs[0]?.artist;
  const dur = data.songs.reduce((acc, s) => acc + (s.duration ?? 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-end gap-6 p-6 pb-4 bg-gradient-to-b from-sp-elevated to-sp-card">
        <div className="w-48 h-48 flex-shrink-0 rounded overflow-hidden bg-sp-elevated shadow-2xl">
          {cover ? (
            <img src={cover} alt={albumName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 size={64} className="text-sp-faint" />
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-sp-muted uppercase tracking-widest mb-2">Album</p>
          <h1 className="text-4xl font-black mb-3 leading-tight">{albumName}</h1>
          <div className="flex items-center gap-1 text-sm text-sp-muted">
            {artist && (
              <Link to={`/artists/${encodeURIComponent(artist)}`} className="text-sp-text font-semibold hover:underline">
                {artist}
              </Link>
            )}
            {artist && year && <span>·</span>}
            {year && <span>{year}</span>}
            <span>·</span>
            <span>{data.songs.length} songs</span>
            {dur > 0 && <><span>,</span><span>{totalDuration(dur)}</span></>}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => playQueue(data.songs, 0)}
            className="w-14 h-14 bg-sp-green rounded-full flex items-center justify-center hover:bg-sp-green-hover transition-colors shadow"
          >
            <Play size={24} fill="black" className="text-black ml-1" />
          </button>
        </div>

        <SongList songs={data.songs} likedIds={likedIds} showAlbum={false} />
      </div>
    </div>
  );
}
