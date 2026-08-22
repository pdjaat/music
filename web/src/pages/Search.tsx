import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { searchAll } from '../lib/catalog';
import { TrackRow } from '../components/TrackRow';
import { AlbumCard, ArtistCard, PlaylistCard } from '../components/TrackCard';
import { RowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { useDebouncedValue } from '../hooks/useDebounce';
import type { SearchResults } from '../lib/types';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'song', label: 'Songs' },
  { id: 'album', label: 'Albums' },
  { id: 'artist', label: 'Artists' },
  { id: 'playlist', label: 'Playlists' },
] as const;

const SUGGESTIONS = ['Arijit Singh', 'AP Dhillon', 'Khasa Aala Chahar', 'Punjabi hits', 'Haryanvi songs', 'Hindi romantic songs', 'सिद्धू मूसेवाला', 'Tamil hits', 'Bhajan', 'Sufi qawwali'];

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const typeParam = (params.get('type') as (typeof TABS)[number]['id']) ?? 'all';
  const [type, setType] = useState<typeof typeParam>(TABS.some((t) => t.id === typeParam) ? typeParam : 'all');
  const [input, setInput] = useState(q);
  const debounced = useDebouncedValue(input, 350);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const runSearch = useCallback(async (query: string, searchType: (typeof TABS)[number]['id']) => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    const reqId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const r = await searchAll(query, searchType, 30);
      if (reqId === requestRef.current) setResults(r);
    } catch (e) {
      if (reqId === requestRef.current) {
        setError(e instanceof Error ? e.message : 'Search failed. Please try again.');
        setResults(null);
      }
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setInput(q);
  }, [q]);

  useEffect(() => {
    if (!debounced.trim()) return;
    const nextParams = new URLSearchParams(params);
    nextParams.set('q', debounced.trim());
    setParams(nextParams, { replace: true });
    void runSearch(debounced.trim(), type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, type]);

  const changeType = (t: (typeof TABS)[number]['id']) => {
    setType(t);
    const nextParams = new URLSearchParams(params);
    nextParams.set('type', t);
    setParams(nextParams, { replace: true });
  };

  const hasQuery = Boolean(input.trim());
  const tracks = results?.tracks ?? [];
  const albums = results?.albums ?? [];
  const artists = results?.artists ?? [];
  const playlists = results?.playlists ?? [];

  return (
    <div className="pt-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Try “Arijit Singh”, “अरिजीत सिंह”, “AP Dhillon”…"
          className="w-full rounded-2xl border border-white/10 bg-ink-800 py-3.5 pl-12 pr-4 text-base outline-none transition focus:border-accent-400/40 focus:bg-ink-700"
        />
      </div>

      <div className="mt-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => changeType(t.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${type === t.id ? 'bg-white/12 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto hidden shrink-0 items-center gap-1 text-xs text-zinc-500 sm:flex">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Debounced search · transliteration-aware
        </span>
      </div>

      {!hasQuery ? (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><TrendingUp className="h-5 w-5 text-accent-400" /> Popular searches</h2>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => setInput(s)} className="rounded-full border border-white/10 bg-ink-800 px-4 py-2 text-sm font-medium transition hover:border-accent-400/40 hover:text-accent-400">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : loading && !results ? (
        <div className="mt-6"><RowSkeleton count={8} /></div>
      ) : error ? (
        <div className="mt-6"><EmptyState title="Search failed" message={error} /></div>
      ) : results && tracks.length + albums.length + artists.length + playlists.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={`No results for “${input}”`}
            message="Try a different spelling, a transliteration (e.g. “khasa aala chahar”), or a broader term."
          />
        </div>
      ) : results ? (
        <div className="mt-6 space-y-8">
          {tracks.length > 0 && (
            <section>
              <h2 className="mb-2 text-base font-extrabold">Songs <span className="text-xs font-normal text-zinc-500">({tracks.length})</span></h2>
              <div className="space-y-1">
                {tracks.map((t) => (
                  <TrackRow key={`${t.provider}:${t.providerTrackId}`} track={t} context={tracks} />
                ))}
              </div>
            </section>
          )}
          {albums.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-extrabold">Albums</h2>
              <div className="flex gap-4 overflow-x-auto no-scrollbar">
                {albums.map((a) => <AlbumCard key={`${a.provider}:${a.providerAlbumId}`} album={a} />)}
              </div>
            </section>
          )}
          {artists.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-extrabold">Artists</h2>
              <div className="flex gap-4 overflow-x-auto no-scrollbar">
                {artists.map((a) => <ArtistCard key={`${a.provider}:${a.providerArtistId}`} artist={a} />)}
              </div>
            </section>
          )}
          {playlists.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-extrabold">Playlists</h2>
              <div className="flex gap-4 overflow-x-auto no-scrollbar">
                {playlists.map((p) => <PlaylistCard key={`${p.provider}:${p.providerPlaylistId}`} playlist={p} />)}
              </div>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
