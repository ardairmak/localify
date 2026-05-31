export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT,
    album_artist TEXT,
    album TEXT,
    year INTEGER,
    genre TEXT,
    duration REAL,
    track_number INTEGER,
    disc_number INTEGER,
    file_path TEXT NOT NULL UNIQUE,
    file_size INTEGER,
    format TEXT,
    bitrate INTEGER,
    sample_rate INTEGER,
    cover_art TEXT,
    date_added TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    cover_art TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS playlist_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(playlist_id, song_id)
  );

  CREATE TABLE IF NOT EXISTS liked_songs (
    song_id INTEGER PRIMARY KEY REFERENCES songs(id) ON DELETE CASCADE,
    liked_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
  CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album);
  CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre);
  CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
  CREATE INDEX IF NOT EXISTS idx_playlist_tracks_song ON playlist_tracks(song_id);
`;
