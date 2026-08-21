import { Heart, Home, Library, ListMusic, LogOut, Search, Settings } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Player } from "../components/Player";
import { ToastHost } from "../components/Toast";
import { useAuth } from "../store/auth";

const links = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/library", icon: Library, label: "Library" },
  { to: "/playlists", icon: ListMusic, label: "Playlists" },
  { to: "/favorites", icon: Heart, label: "Favorites" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function AppShell() {
  const { user, logout } = useAuth();
  return (
    <div className="h-screen flex flex-col">
      <div className="flex flex-1 min-h-0">
        <aside className="hidden md:flex w-60 flex-col border-r border-line bg-panel/80 p-4">
          <div className="font-display text-2xl tracking-tight">
            Lumen<span className="text-ember">.</span>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-white/40">Independent radio</p>
          <nav className="mt-8 space-y-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`
                }
              >
                <l.icon size={18} />
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto text-sm text-white/50">
            <p className="truncate">{user?.displayName}</p>
            {user?.id !== "guest" ? (
              <button onClick={logout} className="mt-2 flex items-center gap-2 text-white/40 hover:text-white">
                <LogOut size={14} /> Log out
              </button>
            ) : (
              <Link to="/auth" className="mt-2 block text-ember text-sm">
                Sign in
              </Link>
            )}
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto scrollbar-thin pb-4">
          <Outlet />
        </main>
      </div>
      <Player />
      <nav className="md:hidden flex justify-around border-t border-line bg-panel py-2">
        {links.slice(0, 5).map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({ isActive }) => (isActive ? "text-ember" : "text-white/50")}>
            <l.icon size={20} />
          </NavLink>
        ))}
      </nav>
      <ToastHost />
    </div>
  );
}
