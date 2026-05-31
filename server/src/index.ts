import express from 'express';
import cors from 'cors';
import path from 'path';
import { COVERS_DIR } from './db';
import songsRouter from './routes/songs';
import artistsRouter from './routes/artists';
import albumsRouter from './routes/albums';
import playlistsRouter from './routes/playlists';
import likedRouter from './routes/liked';
import libraryRouter from './routes/library';
import searchRouter from './routes/search';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve cover art
app.use('/api/covers', express.static(COVERS_DIR));

// Routes
app.use('/api/songs', songsRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/liked', likedRouter);
app.use('/api/library', libraryRouter);
app.use('/api/search', searchRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Localify server running on http://localhost:${PORT}`);
});

export default app;
