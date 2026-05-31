import { useQuery } from '@tanstack/react-query';
import { getSongs, getLiked } from '../api';
import SongList from '../components/library/SongList';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';

export default function Songs() {
  const { data, isLoading } = useQuery({
    queryKey: ['songs'],
    queryFn: () => getSongs({ limit: 500 }),
  });
  const { data: likedData } = useQuery({ queryKey: ['liked'], queryFn: getLiked });
  const likedIds = new Set(likedData?.songs.map(s => s.id) ?? []);

  if (isLoading) {
    return <div className="flex justify-center py-24"><Spinner size={40} /></div>;
  }

  const songs = data?.songs ?? [];

  if (!songs.length) {
    return (
      <EmptyState
        title="No songs yet"
        description="Add your music folder in Settings to get started"
        action={
          <Link to="/settings" className="bg-sp-green text-black font-semibold px-6 py-2 rounded-full hover:bg-sp-green-hover transition-colors text-sm">
            Open Settings
          </Link>
        }
      />
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Songs</h1>
        <p className="text-sp-muted text-sm mt-1">{data?.total} songs</p>
      </div>
      <SongList songs={songs} likedIds={likedIds} showAlbum showCover />
    </div>
  );
}
