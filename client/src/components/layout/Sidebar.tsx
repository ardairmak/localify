import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Music2, Users, Disc3, ListMusic, Heart, Settings, Plus, AudioLines } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPlaylists, coverUrl } from '../../api';

const navItems = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/search', icon: Search, label: 'Search' },
];

const libraryItems = [
  { to: '/songs', icon: Music2, label: 'Songs' },
  { to: '/artists', icon: Users, label: 'Artists' },
  { to: '/albums', icon: Disc3, label: 'Albums' },
];

function NavItem({ to, icon: Icon, label, end }: { to: string; icon: React.ElementType; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-4 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
          isActive ? 'text-sp-text' : 'text-sp-muted hover:text-sp-text'
        }`
      }
    >
      <Icon size={24} />
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['playlists'], queryFn: getPlaylists });

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col gap-2 overflow-hidden">
      {/* Logo */}
      <div className="bg-sp-card rounded-lg px-4 py-5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sp-text hover:text-sp-green transition-colors"
        >
          <AudioLines size={28} className="text-sp-green" />
          <span className="text-xl font-bold tracking-tight">Localify</span>
        </button>
      </div>

      {/* Nav + Library */}
      <div className="bg-sp-card rounded-lg flex-1 overflow-hidden flex flex-col">
        {/* Main nav */}
        <nav className="p-2 border-b border-sp-elevated">
          {navItems.map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* Library */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-sp-muted text-sm font-semibold uppercase tracking-widest">Library</span>
            <button
              onClick={() => navigate('/playlists')}
              className="text-sp-muted hover:text-sp-text transition-colors"
              title="New playlist"
            >
              <Plus size={20} />
            </button>
          </div>

          <nav className="px-2">
            {libraryItems.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
            <NavItem to="/liked" icon={Heart} label="Liked Songs" />
          </nav>

          {/* Playlists */}
          {data && data.playlists.length > 0 && (
            <div className="flex-1 overflow-y-auto mt-2 border-t border-sp-elevated pt-2 px-2">
              <p className="px-4 py-1 text-xs text-sp-faint font-semibold uppercase tracking-widest">Playlists</p>
              {data.playlists.map(pl => (
                <NavLink
                  key={pl.id}
                  to={`/playlists/${pl.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-colors truncate ${
                      isActive ? 'text-sp-text' : 'text-sp-muted hover:text-sp-text'
                    }`
                  }
                >
                  {pl.cover_art ? (
                    <img src={coverUrl(pl.cover_art)!} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                  ) : (
                    <ListMusic size={16} className="flex-shrink-0" />
                  )}
                  <span className="truncate">{pl.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="p-2 border-t border-sp-elevated">
          <NavItem to="/settings" icon={Settings} label="Settings" />
        </div>
      </div>
    </aside>
  );
}
