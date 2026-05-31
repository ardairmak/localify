import { useQuery } from '@tanstack/react-query';
import { Play, Heart } from 'lucide-react';
import { getLiked } from '../api';
import { usePlayerStore } from '../store/playerStore';
import SongList from '../components/library/SongList';
import Spinner from '../components/ui/Spinner';

export default function LikedSongs() {
  const { data, isLoading } = useQuery({ queryKey: ['liked'], queryFn: getLiked });
  const playQueue = usePlayerStore(s => s.playQueue);
  const songs = data?.songs ?? [];
  const likedIds = new Set(songs.map(s => s.id));

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size={40} /></div>;

  return (
    <div>
      <div className="flex items-end gap-6 p-6 pb-4 bg-gradient-to-b from-[#4a235a] to-sp-card">
        <div className="w-48 h-48 flex-shrink-0 rounded bg-gradient-to-br from-[#4a1942] to-[#1a0a2e] flex items-center justify-center shadow-2xl">
          <Heart size={64} className="text-white" fill="white" />
        </div>
        <div>
          <p className="text-xs font-semibold text-sp-muted uppercase tracking-widest mb-2">Playlist</p>
          <h1 className="text-5xl font-black mb-3">Liked Songs</h1>
          <p className="text-sp-muted text-sm">{songs.length} songs</p>
        </div>
      </div>

      <div className="p-6">
        {songs.length > 0 && (
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => playQueue(songs, 0)}
              className="w-14 h-14 bg-sp-green rounded-full flex items-center justify-center hover:bg-sp-green-hover transition-colors shadow"
            >
              <Play size={24} fill="black" className="text-black ml-1" />
            </button>
          </div>
        )}

        {songs.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={64} className="text-sp-faint mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Songs you like will appear here</h2>
            <p className="text-sp-muted text-sm">Save songs by tapping the heart icon</p>
          </div>
        ) : (
          <SongList songs={songs} likedIds={likedIds} showAlbum showCover />
        )}
      </div>
    </div>
  );
}
