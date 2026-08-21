import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layouts/AppShell";
import { Auth } from "./pages/Auth";
import { Favorites } from "./pages/Favorites";
import { Home } from "./pages/Home";
import { Library } from "./pages/Library";
import { Playlists } from "./pages/Playlists";
import { Search } from "./pages/Search";
import { Settings } from "./pages/Settings";
import { useAuth } from "./store/auth";
import { useLibrary } from "./store/library";
import { resolveAudiusHost } from "./api/music";

function Guard({ children }: { children: React.ReactNode }) {
  const { ready } = useAuth();
  if (!ready) return <div className="p-10 text-white/50">Loading session…</div>;
  return <>{children}</>;
}

export default function App() {
  const hydrate = useAuth((s) => s.hydrate);
  const user = useAuth((s) => s.user);
  const libHydrate = useLibrary((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    resolveAudiusHost();
  }, [hydrate]);

  useEffect(() => {
    if (user) libHydrate(user.id);
  }, [user, libHydrate]);

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/"
        element={
          <Guard>
            <AppShell />
          </Guard>
        }
      >
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="library" element={<Library />} />
        <Route path="playlists" element={<Playlists />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
