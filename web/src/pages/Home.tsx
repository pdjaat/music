import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Music2, Radio, RefreshCw, Sparkles } from 'lucide-react';
import { getBrowserRails, getHome } from '../lib/catalog';
import type { BrowserRails } from '../lib/catalog';
import type { HomeData } from '../lib/types';
import { Rail } from '../components/Rail';
import { AlbumCard, ArtistCard, PlaylistCard, TrackCard } from '../components/TrackCard';
import { TrackRow } from '../components/TrackRow';
import { RailSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { useAuthStore } from '../state/auth';
import { usePlayerStore } from '../state/player';
import { SignInPrompt } from '../components/SignInPrompt';

export function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rails, setRails] = useState<BrowserRails | null>(null);
  const [railsLoading, setRailsLoading] = useState(false);
  const [railsNonce, setRailsNonce] = useState(0);
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const home = await getHome();
      setData(home);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your home feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // When the server's providers are unreachable, fill the trending/new-releases
  // rails from legal browser providers — WITHOUT blocking the first paint.
  useEffect(() => {
    if (!data?.providersUnavailable) return;
    let cancelled = false;
    setRailsLoading(true);
    getBrowserRails()
      .then((r) => { if (!cancelled) setRails(r); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setRailsLoading(false); });
    return () => { cancelled = true; };
  }, [data?.providersUnavailable, railsNonce]);

  const refresh = async () => {
    setRefreshing(true);
    setRails(null);
    setRailsNonce((n) => n + 1);
    await load(true);
    setRefreshing(false);
  };

  const trending = rails?.trending ?? data?.trending ?? [];
  const newReleases = rails?.newReleases ?? data?.newReleases ?? [];

  if (loading && !data) {
    return (
      <div className="space-y-10 pt-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="skeleton mb-3 h-6 w-44 rounded-lg" />
            <RailSkeleton count={6} />
          </div>
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <EmptyState
        icon={<RefreshCw className="h-8 w-8" />}
        title="Couldn’t load your feed"
        message={error}
        action={<button onClick={() => void load()} className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/15">Try again</button>}
      />
    );
  }
  if (!data) return null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return 'Late night listening';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="pt-2">
      {/* hero */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-soft p-6 sm:p-10">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
        <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-rose2-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-sm font-semibold text-accent-400">{greeting}{user ? `, ${user.displayName.split(' ')[0]}` : ''} 👋</p>
          <h1 className="mt-2 max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            Indian music, <span className="text-gradient">every language.</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm text-zinc-300">
            Hindi · Punjabi · Haryanvi · Rajasthani · Bhojpuri · Marathi · Tamil and more — streamed legally with clear provider attribution.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button onClick={refresh} className="flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:opacity-90">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh new releases
            </button>
            <Link to="/radio" className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold transition hover:bg-white/15">
              <Radio className="h-4 w-4" /> Explore radio
            </Link>
          </div>
        </div>
      </div>

      {/* quick language chips */}
      <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {data.languages.slice(0, 14).map((l) => (
          <Link
            key={l.id}
            to={`/language/${l.id}`}
            className="shrink-0 rounded-full border border-white/10 bg-ink-800 px-4 py-2 text-sm font-semibold transition hover:border-accent-400/40 hover:text-accent-400"
          >
            {l.name_native} <span className="text-zinc-500">{l.name}</span>
          </Link>
        ))}
      </div>

      {/* recently played */}
      {user && data.recentlyPlayed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-extrabold tracking-tight sm:text-xl">Recently played</h2>
          <div className="space-y-1">
            {data.recentlyPlayed.slice(0, 6).map((t) => (
              <TrackRow key={`${t.provider}:${t.providerTrackId}`} track={t} context={data.recentlyPlayed} showAlbum={false} />
            ))}
          </div>
        </section>
      )}

      {/* continue listening */}
      {data.continueListening.length > 0 && (
        <Rail title="Continue listening" subtitle="Pick up where you left off">
          {data.continueListening.map((t) => (
            <TrackCard key={`${t.provider}:${t.providerTrackId}`} track={t} />
          ))}
        </Rail>
      )}

      {/* new releases */}
      {newReleases.length > 0 ? (
        <Rail title="New releases" subtitle="Latest tracks from legal providers" linkTo="/search?q=new+releases">
          {newReleases.map((t) => (
            <TrackCard key={`${t.provider}:${t.providerTrackId}`} track={t} />
          ))}
        </Rail>
      ) : railsLoading ? (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-extrabold tracking-tight sm:text-xl">New releases</h2>
          <RailSkeleton count={5} />
        </div>
      ) : (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-extrabold tracking-tight sm:text-xl">New releases</h2>
          <EmptyState title="New releases unavailable" message="No legal provider is reachable right now. Check your connection or try again shortly." />
        </div>
      )}

      {/* trending */}
      {trending.length > 0 && (
        <Rail title="Trending in India" subtitle="What everyone’s listening to" linkTo="/search?q=trending">
          {trending.map((t) => (
            <TrackCard key={`${t.provider}:${t.providerTrackId}`} track={t} />
          ))}
        </Rail>
      )}

      {/* recommended */}
      {data.recommended.tracks.length > 0 && (
        <Rail title="Recommended for you" subtitle={data.recommended.reasons[0] ?? 'Based on your listening'} linkTo="/search?q=recommended">
          {data.recommended.tracks.map((t) => (
            <TrackCard key={`${t.provider}:${t.providerTrackId}`} track={t} />
          ))}
        </Rail>
      )}

      {/* daily mixes */}
      {data.mixes.filter((m) => m.tracks.length > 0).length > 0 && (
        <Rail title="Daily mixes" subtitle="Made for your taste">
          {data.mixes.filter((m) => m.tracks.length > 0).map((m) => (
            <div key={m.title} className="w-40 shrink-0 snap-start sm:w-44">
              <button
                onClick={() => usePlayerStore.getState().playQueue(m.tracks, 0)}
                className="group relative block w-full"
                aria-label={`Play ${m.title}`}
              >
                <div className="flex aspect-square w-full flex-wrap overflow-hidden rounded-2xl shadow-card">
                  {m.tracks.slice(0, 4).map((t) => (
                    <img key={`${t.provider}:${t.providerTrackId}`} src={t.artworkUrl} alt="" loading="lazy" className="h-1/2 w-1/2 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                  ))}
                </div>
                <span className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white opacity-0 shadow-glow transition group-hover:opacity-100">
                  <Flame className="h-5 w-5 fill-current" />
                </span>
              </button>
              <div className="mt-2 truncate text-sm font-semibold">{m.title}</div>
              <div className="truncate text-xs text-zinc-400">{m.subtitle}</div>
            </div>
          ))}
        </Rail>
      )}

      {/* featured playlists */}
      {data.featured.length > 0 && (
        <Rail title="Featured playlists" subtitle="Hand-picked mixes" linkTo="/library">
          {data.featured.map((f) => (
            <Link key={f.id} to={`/featured/${f.id}`} className="group w-40 shrink-0 snap-start sm:w-44">
              <div className="flex aspect-square w-full flex-wrap overflow-hidden rounded-2xl shadow-card transition group-hover:scale-[1.02]">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1/2 w-1/2 ${i % 2 === 0 ? 'bg-brand-soft' : 'bg-ink-700'}`} style={{ backgroundImage: i === 0 ? undefined : undefined }} />
                ))}
              </div>
              <div className="mt-2 truncate text-sm font-semibold group-hover:underline">{f.title}</div>
              <div className="truncate text-xs text-zinc-400">{f.subtitle}</div>
            </Link>
          ))}
        </Rail>
      )}

      {/* radio stations */}
      {data.stations.length > 0 && (
        <Rail title="Regional radio" subtitle="Continuous, hands-free listening" linkTo="/radio">
          {data.stations.slice(0, 10).map((s) => (
            <Link key={s.id} to={`/radio/${s.id}`} className="group w-36 shrink-0 snap-start sm:w-40">
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-brand-soft shadow-card transition group-hover:scale-[1.02]">
                <Radio className="h-12 w-12 text-accent-400/80" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-white">
                    <Music2 className="h-5 w-5 fill-current" />
                  </span>
                </span>
              </div>
              <div className="mt-2 truncate text-sm font-semibold group-hover:underline">{s.name}</div>
              <div className="truncate text-xs text-zinc-400">{s.description}</div>
            </Link>
          ))}
        </Rail>
      )}

      {/* mood/genre chips */}
      <div className="mt-10">
        <h2 className="mb-3 text-lg font-extrabold tracking-tight sm:text-xl">Browse by mood &amp; genre</h2>
        <div className="flex flex-wrap gap-2">
          {data.genres.map((g) => (
            <Link key={g.slug} to={`/genre/${g.slug}`} className="rounded-full border border-white/10 bg-ink-800 px-4 py-2 text-sm font-semibold transition hover:border-accent-400/40 hover:text-accent-400">
              {g.name}
            </Link>
          ))}
        </div>
      </div>

      {data.providersUnavailable && !user && (
        <div className="mt-10">
          <SignInPrompt />
        </div>
      )}

      <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-600">
        <Sparkles className="h-3.5 w-3.5" />
        Streams are served by the providers shown on each track. Previews and full tracks are always labelled. See <Link to="/providers" className="underline hover:text-zinc-400">Providers &amp; legality</Link>.
      </p>
    </div>
  );
}
