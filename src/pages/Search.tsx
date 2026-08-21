import { useEffect, useMemo, useState } from "react";
import { searchAll } from "../api/music";
import { CoverCard } from "../components/CoverCard";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { SkeletonRow } from "../components/Skeleton";
import { TrackRow } from "../components/TrackRow";
import { usePlayer } from "../store/player";
import type { SearchResults } from "../types/music";

export function Search() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const playTrack = usePlayer((s) => s.playTrack);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults(null);
      return;
    }
    let live = true;
    setLoading(true);
    setError(false);
    searchAll(debounced)
      .then((r) => live && setResults(r))
      .catch(() => live && setError(true))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [debounced]);

  const suggestions = useMemo(
    () => ["bach", "electronic", "jazz", "lofi", "piano"].filter((s) => s.includes(q.toLowerCase()) || !q),
    [q]
  );

  return (
    <div className="px-6 py-8">
      <h1 className="font-display text-3xl">Search</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Songs, artists, albums…"
        className="mt-4 w-full max-w-xl rounded-2xl bg-card border border-line px-4 py-3"
        aria-label="Search catalog"
      />
      {!q && (
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setQ(s)} className="rounded-full bg-white/10 px-3 py-1 text-sm">
              {s}
            </button>
          ))}
        </div>
      )}
      {loading && <div className="mt-6"><SkeletonRow /><SkeletonRow /></div>}
      {error && <div className="mt-6"><ErrorState onRetry={() => setDebounced(q + " ")} /></div>}
      {results && !loading && results.tracks.length === 0 && (
        <div className="mt-6">
          <EmptyState title="No matches" body="Try a different spelling or a more general query." />
        </div>
      )}
      {results && results.tracks.length > 0 && (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="font-display text-xl mb-3">Songs</h2>
            {results.tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} queue={results.tracks} index={i} />
            ))}
          </section>
          <section>
            <h2 className="font-display text-xl mb-3">Artists</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {results.artists.map((a) => (
                <CoverCard key={a.id} title={a.name} artwork={a.artwork} onPlay={() => results.tracks[0] && playTrack(results.tracks[0], results.tracks)} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="font-display text-xl mb-3">Albums</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {results.albums.map((a) => (
                <CoverCard key={a.id} title={a.title} subtitle={a.artist} artwork={a.artwork} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
