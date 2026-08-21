import { useEffect, useState } from "react";
import { CATALOG, FEATURED_PLAYLISTS } from "../api/catalog";
import { fetchFeaturedPlaylists, fetchTrending } from "../api/music";
import { CoverCard } from "../components/CoverCard";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { SkeletonGrid, SkeletonRow } from "../components/Skeleton";
import { TrackRow } from "../components/TrackRow";
import { useLibrary } from "../store/library";
import { usePlayer } from "../store/player";
import type { RemotePlaylist, Track } from "../types/music";
import { useAuth } from "../store/auth";

export function Home() {
  const { user } = useAuth();
  const recent = useLibrary((s) => s.recentlyPlayed);
  const playTrack = usePlayer((s) => s.playTrack);
  const [trending, setTrending] = useState<Track[]>(CATALOG);
  const [playlists, setPlaylists] = useState<RemotePlaylist[]>(FEATURED_PLAYLISTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    setError(false);
    try {
      const [t, p] = await Promise.all([fetchTrending(), fetchFeaturedPlaylists()]);
      if (t.length) setTrending(t);
      if (p.length) setPlaylists(p);
    } catch {
      setError(false);
      setTrending(CATALOG);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const artists = Array.from(new Map(trending.map((t) => [t.artist, t])).values()).slice(0, 8);
  const albums = trending.slice(0, 8);

  return (
    <div className="px-6 py-8 space-y-10">
      <header>
        <p className="text-white/50 text-sm">Good listening</p>
        <h1 className="font-display text-4xl">{user?.displayName?.split(" ")[0]}, your night mix</h1>
        <p className="mt-2 max-w-2xl text-white/50 text-sm">
          Lumen streams legally licensed independent catalogs (Audius, Jamendo CC, Internet Archive public-domain). It is not affiliated with Spotify, Apple Music, YouTube, or Google.
        </p>
      </header>

      {error && <ErrorState onRetry={load} />}
      {loading && (
        <>
          <SkeletonGrid />
          <SkeletonRow />
        </>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-4">Recently played</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recent.slice(0, 6).map((t) => (
              <CoverCard key={t.id} title={t.title} subtitle={t.artist} artwork={t.artwork} onPlay={() => playTrack(t, recent)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl mb-4">Popular right now</h2>
        {!loading && trending.length === 0 ? (
          <EmptyState title="No tracks yet" body="The catalog could not be reached. Retry or search later." />
        ) : (
          <div className="space-y-1">
            {trending.slice(0, 10).map((t, i) => (
              <TrackRow key={t.id} track={t} queue={trending} index={i} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Recommended albums</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {albums.map((t) => (
            <CoverCard key={t.id} title={t.album || t.title} subtitle={t.artist} artwork={t.artwork} onPlay={() => playTrack(t, trending)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Artists to follow</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {artists.map((t) => (
            <CoverCard key={t.artist} title={t.artist} artwork={t.artwork} onPlay={() => playTrack(t, trending)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Featured playlists</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {playlists.map((p) => (
            <CoverCard key={p.id} title={p.title} subtitle={p.source} artwork={p.artwork} onPlay={() => trending[0] && playTrack(trending[0], trending)} />
          ))}
        </div>
      </section>
    </div>
  );
}
