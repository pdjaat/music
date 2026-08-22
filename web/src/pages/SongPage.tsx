import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';
import { api } from '../lib/api';
import { getTrack } from '../lib/catalog';
import { Artwork } from '../components/Artwork';
import { ProviderBadge, PreviewTag } from '../components/ProviderBadge';
import { TrackRow } from '../components/TrackRow';
import { RowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { usePlayerStore } from '../state/player';
import { formatDuration, timeAgo } from '../lib/text';
import type { Track } from '../lib/types';

export function SongPage() {
  const { id } = useParams();
  const [track, setTrack] = useState<Track | null>(null);
  const [related, setRelated] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { current, isPlaying, togglePlay, playTrack } = usePlayerStore();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getTrack(Number(id));
      setTrack(data.track);
      setRelated(data.related);
    } catch (e) {
      // In browser mode, the track may not exist server-side; try search fallback.
      const err = e as { status?: number };
      if (err.status === 404) {
        const res = await api<{ track: Track }>('/api/tracks/ingest', { method: 'POST', body: { track: { title: id, artistName: '', provider: 'unknown', providerTrackId: id, stream: { kind: 'unavailable', isPreview: false, providerTrackId: id } } } }).catch(() => null);
        void res;
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="pt-2"><RowSkeleton count={6} /></div>;
  if (!track) return <EmptyState title="Song not found" message="This song isn’t in the catalog." />;

  const isCurrent = current?.providerTrackId === track.providerTrackId && current?.provider === track.provider;
  const playing = isCurrent && isPlaying;

  return (
    <div className="pt-2">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <Artwork src={track.artworkUrl} alt={track.title} className="h-44 w-44 shrink-0 shadow-card sm:h-52 sm:w-52" rounded="rounded-3xl" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Song <ProviderBadge track={track} /></p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{track.title}</h1>
          <p className="mt-1 text-base text-zinc-300">
            <Link to={`/artist/${track.provider}/${encodeURIComponent(track.providerTrackId)}`} className="font-semibold hover:underline">{track.artistName}</Link>
            {track.albumName && <> · {track.albumName}</>}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {formatDuration(track.durationSec)}{track.releaseDate ? <> · {timeAgo(track.releaseDate)}</> : ''}{track.language ? <> · {track.language}</> : ''}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => (isCurrent ? togglePlay() : playTrack(track))}
              disabled={track.playable === false}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow transition hover:scale-105 disabled:opacity-40"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="ml-0.5 h-6 w-6 fill-current" />}
            </button>
            {track.stream.isPreview && <PreviewTag track={track} />}
            {track.stream.attribution && <span className="text-[11px] text-zinc-500">{track.stream.attribution}</span>}
          </div>
        </div>
      </div>

      {track.lyrics && (
        <div className="mt-8">
          <h2 className="mb-2 text-lg font-extrabold">Lyrics</h2>
          <pre className="whitespace-pre-wrap rounded-2xl border border-white/5 bg-ink-850 p-5 font-sans text-sm leading-relaxed text-zinc-300">{track.lyrics}</pre>
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-lg font-extrabold">You might also like</h2>
          <div className="space-y-1">
            {related.map((t) => (
              <TrackRow key={`${t.provider}:${t.providerTrackId}`} track={t} context={related} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
