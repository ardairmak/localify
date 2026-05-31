import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { coverUrl } from '../../api';
import type { Artist } from '../../types';

export default function ArtistCard({ artist }: { artist: Artist }) {
  const cover = coverUrl(artist.cover_art);

  return (
    <Link
      to={`/artists/${encodeURIComponent(artist.name)}`}
      className="bg-sp-card hover:bg-sp-elevated transition-colors p-4 rounded-lg group cursor-pointer block"
    >
      <div className="mb-4">
        <div className="w-full aspect-square rounded-full overflow-hidden bg-sp-elevated">
          {cover ? (
            <img src={cover} alt={artist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Users size={48} className="text-sp-faint" />
            </div>
          )}
        </div>
      </div>
      <p className="font-semibold text-sp-text text-sm truncate">{artist.name}</p>
      <p className="text-sp-muted text-xs mt-1">
        {artist.song_count} {artist.song_count === 1 ? 'song' : 'songs'}
      </p>
    </Link>
  );
}
