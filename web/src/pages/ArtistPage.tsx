import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { getArtist } from '../lib/catalog';
import { Artwork } from '../components/Artwork';
import { TrackRow } from '../components/TrackRow';
import { RowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { usePlayerStore } from '../state/player';
import type { Artist } from '../lib/types';

export function ArtistPage() {
  const { provider = '', providerId = '' } = useParams();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setArtist(await getArtist(provider, providerId));
    } catch {
      setError('This artist could not be loaded. The provider may be unavailable.');
    } finally {
      setLoading(false);
    }
  }, [provider, providerId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="pt-2"><RowSkeleton count={8} /></div>;
  if (error || !artist) return <EmptyState title="Artist unavailable" message={error ?? 'Not found'} action={<button onClick={() => void load()} className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/15">Try again</button>} />;

  const top = artist.topTracks ?? [];

  return (
    <div className="pt-2">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
        <Artwork src={artist.imageUrl} alt={artist.name} className="h-44 w-44 shrink-0 rounded-full shadow-card" rounded="rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Artist · {artist.provider}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{artist.name}</h1>
          {artist.bio && <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-zinc-400">{artist.bio}</p>}
          <div className="mt-4 flex items-center justify-center gap-3 sm:justify-start">
            <button onClick={() => top.length && usePlayerStore.getState().playQueue(top, 0)} disabled={top.length === 0} className="flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-40">
              <Play className="h-4 w-4 fill-current" /> Play top tracks
            </button>
            {artist.providerUrl && (
              <a href={artist.providerUrl} target="_blank" rel="noreferrer" className="text-xs text-zinc-500 underline hover:text-zinc-300">View on provider</a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold">Popular tracks</h2>
        {top.length === 0 ? (
          <EmptyState title="No playable tracks" message="This artist has no available tracks from the current provider." action={<Link to="/search" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/15">Search instead</Link>} />
        ) : (
          <div className="space-y-1">
            {top.map((t) => (
              <TrackRow key={`${t.provider}:${t.providerTrackId}`} track={t} context={top} showAlbum={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
