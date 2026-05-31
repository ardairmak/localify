import type { Song, Artist, Album, Playlist, PlaylistDetail, ScanStatus, SearchResults } from '../types';

const BASE = '/api';

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Songs
export const getSongs = (params?: { page?: number; limit?: number; artist?: string; album?: string; genre?: string }) => {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.artist) q.set('artist', params.artist);
  if (params?.album) q.set('album', params.album);
  if (params?.genre) q.set('genre', params.genre);
  return req<{ songs: Song[]; total: number; page: number; limit: number; pages: number }>(`/songs?${q}`);
};

export const getSong = (id: number) => req<Song>(`/songs/${id}`);

export const streamUrl = (id: number) => `/api/songs/${id}/stream`;

// Artists
export const getArtists = () => req<{ artists: Artist[] }>('/artists');

export const getArtist = (name: string) =>
  req<{ name: string; songs: Song[]; albums: { album: string; year: number | null; track_count: number; cover_art: string | null }[] }>(
    `/artists/${encodeURIComponent(name)}`
  );

// Albums
export const getAlbums = () => req<{ albums: Album[] }>('/albums');

export const getAlbum = (album: string, artist: string) =>
  req<{ album: string; songs: Song[] }>(`/albums/${encodeURIComponent(album)}/${encodeURIComponent(artist)}`);

// Playlists
export const getPlaylists = () => req<{ playlists: Playlist[] }>('/playlists');

export const getPlaylist = (id: number) => req<PlaylistDetail>(`/playlists/${id}`);

export const createPlaylist = (data: { name: string; description?: string }) =>
  req<Playlist>('/playlists', { method: 'POST', body: JSON.stringify(data) });

export const updatePlaylist = (id: number, data: { name?: string; description?: string }) =>
  req<Playlist>(`/playlists/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deletePlaylist = (id: number) => req<void>(`/playlists/${id}`, { method: 'DELETE' });

export const addToPlaylist = (playlistId: number, songId: number) =>
  req<{ message: string }>(`/playlists/${playlistId}/tracks`, { method: 'POST', body: JSON.stringify({ songId }) });

export const removeFromPlaylist = (playlistId: number, songId: number) =>
  req<void>(`/playlists/${playlistId}/tracks/${songId}`, { method: 'DELETE' });

// Liked songs
export const getLiked = () => req<{ songs: Song[] }>('/liked');

export const likeSong = (id: number) => req<{ message: string }>(`/liked/${id}`, { method: 'POST' });

export const unlikeSong = (id: number) => req<void>(`/liked/${id}`, { method: 'DELETE' });

// Library
export const getLibrarySettings = () => req<Record<string, string>>('/library/settings');

export const saveLibrarySettings = (music_folder_path: string) =>
  req<{ music_folder_path: string }>('/library/settings', { method: 'POST', body: JSON.stringify({ music_folder_path }) });

export const startScan = (path?: string) =>
  req<{ message: string; folder: string }>('/library/scan', { method: 'POST', body: JSON.stringify({ path }) });

export const getScanStatus = () => req<ScanStatus>('/library/scan/status');

// Search
export const search = (q: string) => req<SearchResults>(`/search?q=${encodeURIComponent(q)}`);

// Cover art URL helper
export const coverUrl = (filename: string | null) => (filename ? `/api/covers/${filename}` : null);
