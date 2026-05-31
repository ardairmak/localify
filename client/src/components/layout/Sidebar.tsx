import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Search, Music2, Users, Disc3, ListMusic,
  Heart, Settings, Plus, AudioLines, Library,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getPlaylists, coverUrl } from '../../api';

// ── Collapsed (icon strip) ─────────────────────────────────────────────────

function CollapsedSidebar({ onToggle }: { onToggle: () => void }) {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['playlists'], queryFn: getPlaylists });

  const iconBtn = (label: string, icon: React.ReactNode, to: string) => (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) =>
        `w-12 h-12 rounded-xl flex items-center justify-center transition-colors flex-shrink-0
         ${isActive ? 'bg-sp-elevated text-sp-text' : 'text-sp-muted hover:bg-sp-elevated hover:text-sp-text'}`
      }
    >
      {icon}
    </NavLink>
  );

  return (
    <aside className="w-[72px] flex-shrink-0 bg-sp-black rounded-lg flex flex-col items-center py-3 gap-2 overflow-hidden">
      {/* Logo / expand button */}
      <button
        onClick={onToggle}
        className="w-12 h-12 flex items-center justify-center text-sp-muted hover:text-sp-text transition-colors"
        title="Expand library"
      >
        <Library size={22} />
      </button>

      <button
        onClick={() => navigate('/playlists')}
        className="w-8 h-8 rounded-full bg-sp-elevated hover:bg-sp-hover flex items-center justify-center text-sp-muted hover:text-sp-text transition-colors"
        title="New playlist"
      >
        <Plus size={16} />
      </button>

      {/* Scrollable thumbnail strip */}
      <div className="flex-1 overflow-y-auto w-full flex flex-col items-center gap-2 py-1 [&::-webkit-scrollbar]:hidden">
        {iconBtn('Home', <Home size={20} />, '/')}
        {iconBtn('Search', <Search size={20} />, '/search')}
        {iconBtn('Songs', <Music2 size={20} />, '/songs')}
        {iconBtn('Artists', <Users size={20} />, '/artists')}
        {iconBtn('Albums', <Disc3 size={20} />, '/albums')}

        {/* Liked Songs — purple gradient tile */}
        <NavLink
          to="/liked"
          title="Liked Songs"
          className={({ isActive }) =>
            `w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity
             bg-gradient-to-br from-[#4a1942] to-[#1a0a2e] ${isActive ? 'opacity-100 ring-2 ring-sp-text' : 'opacity-90 hover:opacity-100'}`
          }
        >
          <Heart size={20} fill="white" className="text-white" />
        </NavLink>

        {/* Playlist tiles */}
        {data?.playlists.map(pl => (
          <NavLink
            key={pl.id}
            to={`/playlists/${pl.id}`}
            title={pl.name}
            className={({ isActive }) =>
              `w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-sp-elevated transition-opacity
               ${isActive ? 'opacity-100 ring-2 ring-sp-text' : 'opacity-80 hover:opacity-100'}`
            }
          >
            {pl.cover_art ? (
              <img src={coverUrl(pl.cover_art)!} alt={pl.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ListMusic size={20} className="text-sp-faint" />
              </div>
            )}
          </NavLink>
        ))}
      </div>

      {/* Settings */}
      <NavLink
        to="/settings"
        title="Settings"
        className={({ isActive }) =>
          `w-12 h-12 rounded-xl flex items-center justify-center transition-colors flex-shrink-0
           ${isActive ? 'bg-sp-elevated text-sp-text' : 'text-sp-muted hover:bg-sp-elevated hover:text-sp-text'}`
        }
      >
        <Settings size={20} />
      </NavLink>
    </aside>
  );
}

// ── Expanded ───────────────────────────────────────────────────────────────

function NavItem({ to, icon: Icon, label, end }: { to: string; icon: React.ElementType; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-4 px-4 py-2 rounded-md text-sm font-semibold transition-colors
         ${isActive ? 'text-sp-text' : 'text-sp-muted hover:text-sp-text'}`
      }
    >
      <Icon size={20} />
      {label}
    </NavLink>
  );
}

function ExpandedSidebar({ onToggle }: { onToggle: () => void }) {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['playlists'], queryFn: getPlaylists });

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col gap-2 overflow-hidden">
      {/* Logo */}
      <div className="bg-sp-card rounded-lg px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sp-text hover:text-sp-green transition-colors"
        >
          <AudioLines size={26} className="text-sp-green" />
          <span className="text-xl font-bold tracking-tight">Localify</span>
        </button>
        <button onClick={onToggle} className="text-sp-muted hover:text-sp-text transition-colors" title="Collapse">
          <Library size={18} />
        </button>
      </div>

      {/* Nav + Library */}
      <div className="bg-sp-card rounded-lg flex-1 overflow-hidden flex flex-col">
        {/* Main nav */}
        <nav className="p-2 border-b border-sp-elevated">
          <NavItem to="/" icon={Home} label="Home" end />
          <NavItem to="/search" icon={Search} label="Search" />
        </nav>

        {/* Library */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-sp-muted text-xs font-semibold uppercase tracking-widest">Library</span>
            <button
              onClick={() => navigate('/playlists')}
              className="text-sp-muted hover:text-sp-text transition-colors"
              title="New playlist"
            >
              <Plus size={18} />
            </button>
          </div>

          <nav className="px-2">
            <NavItem to="/songs" icon={Music2} label="Songs" />
            <NavItem to="/artists" icon={Users} label="Artists" />
            <NavItem to="/albums" icon={Disc3} label="Albums" />
            <NavItem to="/liked" icon={Heart} label="Liked Songs" />
          </nav>

          {/* Playlist list */}
          {data && data.playlists.length > 0 && (
            <div className="flex-1 overflow-y-auto mt-2 border-t border-sp-elevated pt-2 px-2">
              <p className="px-4 py-1 text-xs text-sp-faint font-semibold uppercase tracking-widest">Playlists</p>
              {data.playlists.map(pl => (
                <NavLink
                  key={pl.id}
                  to={`/playlists/${pl.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-colors truncate
                     ${isActive ? 'text-sp-text' : 'text-sp-muted hover:text-sp-text'}`
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

// ── Export ─────────────────────────────────────────────────────────────────

export default function Sidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return isOpen
    ? <ExpandedSidebar onToggle={onToggle} />
    : <CollapsedSidebar onToggle={onToggle} />;
}
