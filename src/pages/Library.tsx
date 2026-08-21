import { Link } from "react-router-dom";
import { CoverCard } from "../components/CoverCard";
import { EmptyState } from "../components/EmptyState";
import { TrackRow } from "../components/TrackRow";
import { useLibrary } from "../store/library";
import { usePlayer } from "../store/player";

export function Library() {
  const { favorites, playlists, recentlyPlayed } = useLibrary();
  const playTrack = usePlayer((s) => s.playTrack);
  const albums = Array.from(new Map(favorites.map((t) => [t.album || t.id, t])).values());
  const artists = Array.from(new Map(favorites.concat(recentlyPlayed).map((t) => [t.artist, t])).values());

  return (
    <div className="px-6 py-8 space-y-10">
      <h1 className="font-display text-3xl">Your library</h1>
      <section>
        <div className="flex justify-between">
          <h2 className="font-display text-xl">Liked songs</h2>
          <Link to="/favorites" className="text-sm text-white/50">
            See all
          </Link>
        </div>
        {favorites.length === 0 ? (
          <EmptyState title="No liked songs" body="Tap the heart on any track." />
        ) : (
          favorites.slice(0, 5).map((t, i) => <TrackRow key={t.id} track={t} queue={favorites} index={i} />)
        )}
      </section>
      <section>
        <h2 className="font-display text-xl mb-3">Playlists</h2>
        {playlists.length === 0 ? (
          <EmptyState title="No playlists" body="Create one from the Playlists tab." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {playlists.map((p) => (
              <CoverCard
                key={p.id}
                title={p.name}
                subtitle={`${p.tracks.length} tracks`}
                artwork={p.tracks[0]?.artwork || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23222' width='40' height='40'/%3E%3C/svg%3E"}
                onPlay={() => p.tracks[0] && playTrack(p.tracks[0], p.tracks)}
              />
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="font-display text-xl mb-3">Albums</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {albums.map((t) => (
            <CoverCard key={t.id} title={t.album || t.title} subtitle={t.artist} artwork={t.artwork} onPlay={() => playTrack(t)} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl mb-3">Artists</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {artists.map((t) => (
            <CoverCard key={t.artist} title={t.artist} artwork={t.artwork} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl mb-3">Recently played</h2>
        {recentlyPlayed.map((t, i) => (
          <TrackRow key={t.id} track={t} queue={recentlyPlayed} index={i} />
        ))}
      </section>
    </div>
  );
}
