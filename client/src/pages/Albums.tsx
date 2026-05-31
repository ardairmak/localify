import { useQuery } from '@tanstack/react-query';
import { getAlbums } from '../api';
import AlbumCard from '../components/library/AlbumCard';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

export default function Albums() {
  const { data, isLoading } = useQuery({ queryKey: ['albums'], queryFn: getAlbums });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size={40} /></div>;

  const albums = data?.albums ?? [];

  if (!albums.length) {
    return <EmptyState title="No albums found" description="Scan your library to populate albums" />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Albums</h1>
        <p className="text-sp-muted text-sm mt-1">{albums.length} albums</p>
      </div>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {albums.map(a => <AlbumCard key={`${a.name}-${a.artist}`} album={a} />)}
      </div>
    </div>
  );
}
