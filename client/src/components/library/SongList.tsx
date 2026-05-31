import SongRow from './SongRow';
import type { Song } from '../../types';

interface Props {
  songs: Song[];
  likedIds: Set<number>;
  showAlbum?: boolean;
  showCover?: boolean;
}

export default function SongList({ songs, likedIds, showAlbum = true, showCover = false }: Props) {
  return (
    <div>
      {/* Header */}
      <div
        className={`grid px-4 py-2 border-b border-sp-elevated text-xs text-sp-faint font-semibold uppercase tracking-wider mb-2
          ${showAlbum ? 'grid-cols-[auto_1fr_1fr_auto_auto]' : 'grid-cols-[auto_1fr_auto_auto]'}
        `}
        style={{ gap: '12px' }}
      >
        <span className="w-5 text-center">#</span>
        <span>Title</span>
        {showAlbum && <span>Album</span>}
        <span></span>
        <span>Duration</span>
      </div>

      {songs.map((song, i) => (
        <SongRow
          key={song.id}
          song={song}
          index={i}
          queue={songs}
          isLiked={likedIds.has(song.id)}
          showAlbum={showAlbum}
          showCover={showCover}
        />
      ))}
    </div>
  );
}
