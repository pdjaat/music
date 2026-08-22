import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { getAlbum, getProviderPlaylist } from '../lib/catalog';
import { Artwork } from '../components/Artwork';
import { TrackRow } from '../components/TrackRow';
import { RowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { usePlayerStore } from '../state/player';
import type { Album, ProviderPlaylist, Track } from '../lib/types';

export function AlbumPage({ kind = 'album' }: { kind?: 'album' | 'playlist' }) {
  const { provider = '', providerId = '' } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [playlist, setPlaylist] = useState<ProviderPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (kind === 'playlist') {
        const p = await getProviderPlaylist(provider, providerId);
        setPlaylist(p);
      } else {
        const a = await getAlbum(provider, providerId);
        setAlbum(a);
      }
    } catch {
      setError('This content could not be loaded. The provider may be unavailable.');
    } finally {
      setLoading(false);
    }
  }, [provider, providerId, kind]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <div className="pt-2"><RowSkeleton count={8} /></div>;
  }
  if (error) {
    return <EmptyState title={kind === 'album' ? 'Album unavailable' : 'Playlist unavailable'} message={error} action={<button onClick={() => void load()} className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/15">Try again</button>} />;
  }

  const title = album?.title ?? playlist?.title ?? '';
  const subtitle = album?.artistName ?? playlist?.owner ?? '';
  const cover = album?.coverUrl ?? playlist?.coverUrl;
  const tracks = (album?.tracks ?? playlist?.tracks ?? []) as Track[];
  const providerName = album?.provider ?? playlist?.provider ?? provider;
  const providerIdStr = album?.providerAlbumId ?? playlist?.providerPlaylistId ?? providerId;

  return (
    <div className="pt-2">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <Artwork src={cover} alt={title} className="h-44 w-44 shrink-0 shadow-card sm:h-52 sm:w-52" rounded="rounded-3xl" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{kind === 'album' ? 'Album' : 'Playlist'} · {providerName}</p>
          <h1 className="mt-1 truncate text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && (
            <Link to={`/artist/${provider}/${encodeURIComponent(providerIdStr)}`} className="mt-1 block truncate text-base font-semibold text-zinc-300 hover:underline">
              {subtitle}
            </Link>
          )}
          <p className="mt-1 text-sm text-zinc-400">{tracks.length} tracks</p>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => tracks.length && usePlayerStore.getState().playQueue(tracks, 0)} disabled={tracks.length === 0} className="flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-40">
              <Play className="h-4 w-4 fill-current" /> Play all
            </button>
            {album?.providerUrl && (
              <a href={album.providerUrl} target="_blank" rel="noreferrer" className="text-xs text-zinc-500 underline hover:text-zinc-300">View on provider</a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        {tracks.length === 0 ? (
          <EmptyState title="No playable tracks" message="The provider returned no tracks for this item." />
        ) : (
          <div className="space-y-1">
            {tracks.map((t) => (
              <TrackRow key={`${t.provider}:${t.providerTrackId}`} track={t} context={tracks} showAlbum={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
