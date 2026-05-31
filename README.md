# Localify

A local music player built with React and Node.js. Point it at a folder of audio files and it gives you a Spotify-style interface — browsing by songs, artists, and albums, playlists, liked songs, and a YouTube-to-MP3 downloader that imports straight into your library.

![Three-panel layout with sidebar, library, and now playing](https://via.placeholder.com/800x400?text=screenshot)

## Stack

- **Frontend**: React 18, TypeScript, Tailwind, Zustand, React Query, Vite
- **Backend**: Node.js, Express, SQLite
- **Cover art**: iTunes Search API

## Setup

```bash
npm install
```

Set your music directory in the app's Settings page after launch.

```bash
npm run dev
```

Frontend runs on `localhost:5173`, API on `localhost:3001`.

## Features

- Browse songs, artists, albums
- Playlists with custom cover images
- Liked songs
- YouTube to MP3 downloader with auto-import
- Auto cover art fetch
- Resizable three-panel layout
