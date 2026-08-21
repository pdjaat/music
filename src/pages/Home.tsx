import { useEffect, useState } from "react";
import { CATALOG } from "../api/catalog";
import { FALLBACK_RADIO, genreStations } from "../api/radio";
import { CoverCard } from "../components/CoverCard";
import { EmptyState } from "../components/EmptyState";
import { TrackRow } from "../components/TrackRow";
import { useLibrary } from "../store/library";
import { usePlayer } from "../store/player";
import type { Track } from "../types/music";
import { useAuth } from "../store/auth";

const TABS = [
  { id: "punjabi", label: "Punjabi" },
  { id: "hindi", label: "Hindi" },
  { id: "english", label: "English" },
  { id: "independent", label: "Independent" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function Home() {
  const { user } = useAuth();
  const recent = useLibrary((s) => s.recentlyPlayed);
  const playTrack = usePlayer((s) => s.playTrack);
  const [tab, setTab] = useState<Tab>("punjabi");
  const [lists, setLists] = useState<Record<string, Track[]>>({
    punjabi: FALLBACK_RADIO.punjabi,
    hindi: FALLBACK_RADIO.hindi,
    english: FALLBACK_RADIO.english,
    independent: CATALOG,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    (async () => {
      const [p, h, e] = await Promise.all([
        genreStations("punjabi"),
        genreStations("hindi"),
        genreStations("english"),
      ]);
      if (!live) return;
      setLists({
        punjabi: p.length ? p : FALLBACK_RADIO.punjabi,
        hindi: h.length ? h : FALLBACK_RADIO.hindi,
        english: e.length ? e : FALLBACK_RADIO.english,
        independent: CATALOG,
      });
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, []);

  const tracks = lists[tab] || [];

  return (
    <div className="px-6 py-8 space-y-8">
      <header>
        <p className="text-white/50 text-sm">Good listening</p>
        <h1 className="font-display text-4xl">{user?.displayName?.split(" ")[0]}, pick a station</h1>
        <p className="mt-2 max-w-2xl text-white/50 text-sm">
          Punjabi, Hindi, and English here are <strong className="text-white/70">live internet radio</strong> stations
          that publish their own streams (Radio Browser / SomaFM / Zeno). This is not Spotify, YouTube, or Gaana —
          we cannot legally play on-demand latest chart singles from those catalogs.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t.id ? "bg-ember text-ink" : "bg-white/10"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

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
        <h2 className="font-display text-xl mb-1">
          {tab === "independent" ? "Original Lumen sessions" : `${TABS.find((t) => t.id === tab)?.label} live radio`}
        </h2>
        <p className="text-white/40 text-sm mb-4">
          {loading ? "Finding more stations on Radio Browser…" : tab === "independent" ? "Short original instrumentals bundled with the app." : "Tap play — audio comes from the station in your browser."}
        </p>
        {tracks.length === 0 ? (
          <EmptyState title="No stations yet" body="Check your connection and retry. Radio Browser needs internet." />
        ) : (
          <div className="space-y-1">
            {tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} queue={tracks} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
