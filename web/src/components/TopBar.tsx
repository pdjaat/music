import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bell, Moon, Search, Sun } from 'lucide-react';
import { Logo } from './Sidebar';
import { useUiStore } from '../state/ui';
import { useAuthStore } from '../state/auth';
import { usePlayerStore } from '../state/player';
import { isBrowserMode } from '../lib/catalog';

export function TopBar() {
  const navigate = useNavigate();
  const { theme, setTheme } = useUiStore();
  const user = useAuthStore((s) => s.user);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [browserMode, setBrowserMode] = useState(false);

  useEffect(() => {
    setBrowserMode(isBrowserMode());
    const onMode = (e: Event) => setBrowserMode((e as CustomEvent).detail?.mode === 'browser');
    window.addEventListener('sangeet:mode-changed', onMode);
    return () => window.removeEventListener('sangeet:mode-changed', onMode);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchOpen(false);
      setQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <div className="lg:hidden"><Logo small /></div>
        <div className="hidden items-center gap-1 lg:flex">
          <button onClick={() => navigate(-1)} className="btn-icon" aria-label="Back"><ArrowLeft className="h-4.5 w-4.5" /></button>
          <button onClick={() => navigate(1)} className="btn-icon" aria-label="Forward"><ArrowRight className="h-4.5 w-4.5" /></button>
        </div>

        {/* Search (desktop) */}
        <form onSubmit={submitSearch} className="relative hidden flex-1 max-w-xl md:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums…  (Ctrl K)"
            className="w-full rounded-full border border-white/10 bg-ink-800 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-accent-400/40 focus:bg-ink-700"
          />
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          {browserMode && (
            <span className="hidden items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold text-amber-300 sm:flex" title="The server can’t reach its providers in this environment, so the app streams legal previews/CC audio directly from the browser.">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" /> Preview streams
            </span>
          )}
          <button onClick={() => setSearchOpen(true)} className="btn-icon md:hidden" aria-label="Search"><Search className="h-5 w-5" /></button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="btn-icon" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
          <button className="btn-icon" aria-label="Notifications"><Bell className="h-4.5 w-4.5" /></button>
          {user ? (
            <Link to="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white transition hover:opacity-90">
              {user.displayName[0]?.toUpperCase()}
            </Link>
          ) : (
            <Link to="/login" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15">Sign in</Link>
          )}
        </div>
      </div>

      {/* Search overlay (mobile) */}
      {searchOpen && (
        <div className="border-t border-white/5 px-4 py-3 md:hidden">
          <form onSubmit={submitSearch} className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs, artists, albums…"
              autoFocus
              className="w-full rounded-full border border-white/10 bg-ink-800 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-accent-400/40"
            />
          </form>
        </div>
      )}

      {browserMode && (
        <div className="border-t border-amber-400/10 bg-amber-400/[0.06] px-4 py-2 text-center text-[11px] text-amber-200/90 sm:hidden">
          Preview mode: legal 30s previews &amp; CC streams (server providers offline here).
        </div>
      )}
    </header>
  );
}
