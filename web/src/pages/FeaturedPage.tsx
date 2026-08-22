import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { getFeatured } from '../lib/catalog';
import { TrackRow } from '../components/TrackRow';
import { RowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { usePlayerStore } from '../state/player';
import type { FeaturedPlaylist, Track } from '../lib/types';

export function FeaturedPage() {
  const { id } = useParams();
  const [featured, setFeatured] = useState<FeaturedPlaylist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getFeatured(Number(id))
      .then((r) => { setFeatured(r.featured); setTracks(r.tracks); })
      .catch(() => setError('Could not load this playlist.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="pt-2">
      {loading ? <RowSkeleton count={8} /> : error || !featured ? (
        <EmptyState title="Playlist unavailable" message={error ?? 'Not found'} />
      ) : (
        <>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-3xl bg-brand-gradient/40 shadow-card">
              <Play className="ml-1 h-14 w-14 text-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Featured playlist</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">{featured.title}</h1>
              {featured.subtitle && <p className="mt-1 text-zinc-400">{featured.subtitle}</p>}
              <button onClick={() => tracks.length && usePlayerStore.getState().playQueue(tracks, 0)} disabled={tracks.length === 0} className="mt-4 flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-40">
                <Play className="h-4 w-4 fill-current" /> Play
              </button>
            </div>
          </div>
          <div className="mt-8 space-y-1">
            {tracks.length === 0 ? <EmptyState title="No tracks yet" message="This playlist is empty right now." /> : tracks.map((t) => (
              <TrackRow key={`${t.provider}:${t.providerTrackId}`} track={t} context={tracks} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
