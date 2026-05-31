import { useQuery } from '@tanstack/react-query';
import { getArtists } from '../api';
import ArtistCard from '../components/library/ArtistCard';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

export default function Artists() {
  const { data, isLoading } = useQuery({ queryKey: ['artists'], queryFn: getArtists });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size={40} /></div>;

  const artists = data?.artists ?? [];

  if (!artists.length) {
    return <EmptyState title="No artists found" description="Scan your library to populate artists" />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Artists</h1>
        <p className="text-sp-muted text-sm mt-1">{artists.length} artists</p>
      </div>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {artists.map(a => <ArtistCard key={a.name} artist={a} />)}
      </div>
    </div>
  );
}
