import { Play, Music2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlayerStore } from '../../store/playerStore';
import { coverUrl, getAlbum } from '../../api';
import type { Album } from '../../types';

interface Props {
  album: Album;
}

export default function AlbumCard({ album }: Props) {
  const playSong = usePlayerStore(s => s.playSong);
  const playQueue = usePlayerStore(s => s.playQueue);

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const data = await getAlbum(album.name, album.artist ?? '');
      if (data.songs.length > 0) {
        playQueue(data.songs, 0);
      }
    } catch {
      // ignore
    }
  };

  const cover = coverUrl(album.cover_art);
  const href = `/albums/${encodeURIComponent(album.name)}/${encodeURIComponent(album.artist ?? '')}`;

  return (
    <Link
      to={href}
      className="bg-sp-card hover:bg-sp-elevated transition-colors p-4 rounded-lg group cursor-pointer block"
    >
      <div className="relative mb-4">
        <div className="w-full aspect-square rounded overflow-hidden bg-sp-elevated">
          {cover ? (
            <img src={cover} alt={album.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 size={48} className="text-sp-faint" />
            </div>
          )}
        </div>
        <button
          onClick={handlePlay}
          className="absolute bottom-2 right-2 w-10 h-10 bg-sp-green rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200"
        >
          <Play size={18} fill="black" className="text-black ml-0.5" />
        </button>
      </div>
      <p className="font-semibold text-sp-text text-sm truncate">{album.name}</p>
      <p className="text-sp-muted text-xs mt-1 truncate">{album.year ?? ''}{album.year && album.artist ? ' · ' : ''}{album.artist ?? 'Unknown Artist'}</p>
    </Link>
  );
}
