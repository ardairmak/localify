import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Songs from './pages/Songs';
import Artists from './pages/Artists';
import ArtistDetail from './pages/ArtistDetail';
import Albums from './pages/Albums';
import AlbumDetail from './pages/AlbumDetail';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import LikedSongs from './pages/LikedSongs';
import Search from './pages/Search';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="songs" element={<Songs />} />
            <Route path="artists" element={<Artists />} />
            <Route path="artists/:name" element={<ArtistDetail />} />
            <Route path="albums" element={<Albums />} />
            <Route path="albums/:album/:artist" element={<AlbumDetail />} />
            <Route path="playlists" element={<Playlists />} />
            <Route path="playlists/:id" element={<PlaylistDetail />} />
            <Route path="liked" element={<LikedSongs />} />
            <Route path="search" element={<Search />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
