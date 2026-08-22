import { NavLink } from 'react-router-dom';
import {
  Disc3, Heart, Home, Library, ListMusic, Mic2, Radio, Search, Shield, Settings, LogIn,
} from 'lucide-react';
import { useAuthStore } from '../state/auth';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { PlaylistSummary } from '../lib/types';

const nav = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/radio', label: 'Radio', icon: Radio },
  { to: '/library', label: 'Your Library', icon: Library },
];

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor" aria-hidden>
          <path d="M9 18V6l10-2v11.5a2.5 2.5 0 1 1-2-2.45V7.2l-6 1.2v9.15a2.5 2.5 0 1 1-2-2.45V18z" />
        </svg>
      </div>
      {!small && (
        <div className="leading-tight">
          <div className="text-lg font-extrabold tracking-tight">Sangeet</div>
          <div className="text-[10px] font-medium text-zinc-500">संगीत · Indian music</div>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);

  useEffect(() => {
    if (!user) { setPlaylists([]); return; }
    api<{ playlists: PlaylistSummary[] }>('/api/me/playlists')
      .then((r) => setPlaylists(r.playlists.slice(0, 8)))
      .catch(() => undefined);
  }, [user]);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-white/5 bg-ink-900 p-4 lg:flex">
      <Logo />
      <nav className="mt-6 space-y-1">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'}`
            }
          >
            <Icon className="h-4.5 w-4.5" /> {label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <>
          <div className="mt-6 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Your Library</div>
          <nav className="mt-2 space-y-0.5">
            <NavLink to="/library/liked" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              <Heart className="h-4 w-4 text-rose2-400" /> Liked Songs
            </NavLink>
            <NavLink to="/library/albums" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              <Disc3 className="h-4 w-4" /> Albums
            </NavLink>
            <NavLink to="/library/artists" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
              <Mic2 className="h-4 w-4" /> Artists
            </NavLink>
          </nav>
          <div className="mt-3 max-h-40 space-y-0.5 overflow-y-auto pr-1">
            {playlists.map((p) => (
              <NavLink key={p.id} to={`/playlist/${p.id}`} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
                <ListMusic className="h-4 w-4 shrink-0" />
                <span className="truncate">{p.name}</span>
              </NavLink>
            ))}
            <NavLink to="/library" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:text-white">
              <Library className="h-4 w-4" /> View all
            </NavLink>
          </div>
        </>
      )}

      <div className="mt-auto space-y-1 border-t border-white/5 pt-4">
        <NavLink to="/providers" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:text-white">
          <Shield className="h-4 w-4" /> Providers &amp; legality
        </NavLink>
        <NavLink to="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:text-white">
          <Settings className="h-4 w-4" /> Settings
        </NavLink>
        {user ? (
          <NavLink to="/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:text-white">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-bold text-white">
              {user.displayName[0]?.toUpperCase()}
            </span>
            <span className="truncate">{user.displayName}</span>
          </NavLink>
        ) : (
          <NavLink to="/login" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:text-white">
            <LogIn className="h-4 w-4" /> Sign in
          </NavLink>
        )}
        {user?.isAdmin && (
          <NavLink to="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-accent-400 transition hover:text-white">
            <Shield className="h-4 w-4" /> Admin panel
          </NavLink>
        )}
      </div>
    </aside>
  );
}
