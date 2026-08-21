import { useEffect, useState } from "react";
import { searchCatalog } from "../api/catalog";
import { searchAll } from "../api/music";
import { FALLBACK_RADIO } from "../api/radio";
import { CoverCard } from "../components/CoverCard";
import { EmptyState } from "../components/EmptyState";
import { TrackRow } from "../components/TrackRow";
import { usePlayer } from "../store/player";
import type { SearchResults } from "../types/music";

function pack(tracks: ReturnType<typeof searchCatalog>): SearchResults {
  const artists = Array.from(new Map(tracks.map((t) => [t.artist, { id: t.artist, name: t.artist, artwork: t.artwork, source: t.source }])).values());
  const albums = Array.from(
    new Map(tracks.map((t) => [t.album, { id: t.album || t.id, title: t.album || t.title, artist: t.artist, artwork: t.artwork, source: t.source }])).values()
  );
  return { tracks, artists, albums, playlists: [] };
}

export function Search() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const playTrack = usePlayer((s) => s.playTrack);

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    const n = q.toLowerCase();
    const radio =
      n.includes("punjabi") || n.includes("bhangra")
        ? FALLBACK_RADIO.punjabi
        : n.includes("hindi") || n.includes("bolly")
          ? FALLBACK_RADIO.hindi
          : n.includes("english") || n === "pop"
            ? FALLBACK_RADIO.english
            : [...FALLBACK_RADIO.punjabi, ...FALLBACK_RADIO.hindi, ...FALLBACK_RADIO.english].filter((t) =>
                t.title.toLowerCase().includes(n)
              );
    setResults(pack([...radio, ...searchCatalog(q)]));
    let live = true;
    const t = setTimeout(() => {
      searchAll(q)
        .then((r) => {
          if (live && r.tracks.length) setResults(r);
        })
        .catch(() => undefined);
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="px-6 py-8">
      <h1 className="font-display text-3xl">Search</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="punjabi, bollywood, hindi, english, bhangra…"
        className="mt-4 w-full max-w-xl rounded-2xl bg-card border border-line px-4 py-3"
        aria-label="Search catalog"
        autoFocus
      />
      {!q && (
        <div className="mt-4 flex flex-wrap gap-2">
          {["punjabi", "bollywood", "hindi", "bhangra", "english", "pop"].map((s) => (
            <button key={s} onClick={() => setQ(s)} className="rounded-full bg-white/10 px-3 py-1 text-sm">
              {s}
            </button>
          ))}
        </div>
      )}
      {results && results.tracks.length === 0 && (
        <div className="mt-6">
          <EmptyState title="No matches" body="Try punjabi, bollywood, hindi, or english for live radio." />
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
          {results.artists.length > 0 && (
            <section>
              <h2 className="font-display text-xl mb-3">Artists</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {results.artists.map((a) => (
                  <CoverCard
                    key={a.id}
                    title={a.name}
                    artwork={a.artwork}
                    onPlay={() => results.tracks[0] && playTrack(results.tracks[0], results.tracks)}
                  />
                ))}
              </div>
            </section>
          )}
          {results.albums.length > 0 && (
            <section>
              <h2 className="font-display text-xl mb-3">Albums</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {results.albums.map((a) => (
                  <CoverCard key={a.id} title={a.title} subtitle={a.artist} artwork={a.artwork} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
