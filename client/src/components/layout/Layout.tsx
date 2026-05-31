import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-sp-base overflow-hidden">
      <div className="flex flex-1 overflow-hidden gap-2 p-2 pb-0">
        <Sidebar />
        <main className="flex-1 bg-sp-card rounded-lg overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <PlayerBar />
    </div>
  );
}
