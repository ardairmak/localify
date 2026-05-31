import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';
import NowPlayingPanel from '../player/NowPlayingPanel';
import { usePlayerStore } from '../../store/playerStore';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { nowPlayingOpen, toggleNowPlaying, currentSong } = usePlayerStore();

  return (
    <div className="flex flex-col h-screen bg-sp-base overflow-hidden">
      <div className="flex flex-1 overflow-hidden gap-2 p-2 pb-0">
        {/* Left panel — collapsible */}
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

        {/* Main content + right-panel toggle */}
        <div className="flex-1 flex overflow-hidden gap-2 min-w-0">
          <main className="flex-1 bg-sp-card rounded-lg overflow-y-auto min-w-0">
            <Outlet />
          </main>

          {/* Right toggle chevron when panel is closed */}
          {!nowPlayingOpen && currentSong && (
            <button
              onClick={toggleNowPlaying}
              className="flex-shrink-0 w-6 flex items-center justify-center text-sp-muted hover:text-sp-text transition-colors"
              title="Open Now Playing"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Right panel — Now Playing */}
        {nowPlayingOpen && <NowPlayingPanel />}
      </div>

      <PlayerBar />
    </div>
  );
}
