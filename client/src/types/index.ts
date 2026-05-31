export interface Song {
  id: number;
  title: string;
  artist: string | null;
  album_artist: string | null;
  album: string | null;
  year: number | null;
  genre: string | null;
  duration: number | null;
  track_number: number | null;
  disc_number: number | null;
  file_path: string;
  file_size: number;
  format: string | null;
  bitrate: number | null;
  sample_rate: number | null;
  cover_art: string | null;
  date_added: string;
  liked_at?: string;
  track_added_at?: string;
  position?: number;
}

export interface Artist {
  name: string;
  song_count: number;
  album_count: number;
  cover_art: string | null;
}

export interface Album {
  name: string;
  artist: string | null;
  year: number | null;
  track_count: number;
  cover_art: string | null;
  total_duration?: number;
}

export interface ArtistAlbum {
  album: string;
  year: number | null;
  track_count: number;
  cover_art: string | null;
}

export interface Playlist {
  id: number;
  name: string;
  description: string | null;
  cover_art: string | null;
  track_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlaylistDetail extends Omit<Playlist, 'track_count'> {
  tracks: Song[];
}

export interface ScanStatus {
  isScanning: boolean;
  total: number;
  processed: number;
  errors: number;
  lastScanAt: string | null;
  currentFile: string | null;
  stats: {
    total_songs: number;
    total_artists: number;
    total_albums: number;
  };
}

export interface SearchResults {
  songs: Song[];
  artists: Pick<Artist, 'name' | 'song_count' | 'cover_art'>[];
  albums: Pick<Album, 'name' | 'artist' | 'year' | 'track_count' | 'cover_art'>[];
}
