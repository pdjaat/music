import { NavLink } from 'react-router-dom';
import { Home, Library, Radio, Search, User } from 'lucide-react';
import { useAuthStore } from '../state/auth';
import { usePlayerStore } from '../state/player';

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/radio', label: 'Radio', icon: Radio },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const user = useAuthStore((s) => s.user);
  const hasPlayer = usePlayerStore((s) => Boolean(s.current));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" style={{ bottom: hasPlayer ? 'var(--player-bar-h, 64px)' : 0 }}>
      <div className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${isActive ? 'text-accent-400' : 'text-zinc-500 hover:text-zinc-300'}`
            }
          >
            {to === '/profile' && user ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-gradient text-[9px] font-bold text-white">
                {user.displayName[0]?.toUpperCase()}
              </span>
            ) : (
              <Icon className="h-5 w-5" />
            )}
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
