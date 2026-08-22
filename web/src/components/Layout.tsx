import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { PlayerBar } from './PlayerBar';
import { FullPlayer } from './FullPlayer';
import { Toasts } from './Toasts';
import { PlaylistPickerModal, ShareModal } from './Modals';
import { usePlayerStore } from '../state/player';

export function Layout() {
  const location = useLocation();
  const hasPlayer = usePlayerStore((s) => Boolean(s.current));

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // CSS var so BottomNav can float above the player bar on mobile.
  useEffect(() => {
    document.documentElement.style.setProperty('--player-bar-h', hasPlayer ? '72px' : '0px');
  }, [hasPlayer]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto pb-40 lg:pb-24" id="main-scroll">
            <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <PlayerBar />
      <BottomNav />
      <FullPlayer />
      <Toasts />
      <PlaylistPickerModal />
      <ShareModal />
    </div>
  );
}
