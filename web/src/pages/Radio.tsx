import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Radio as RadioIcon } from 'lucide-react';
import { api } from '../lib/api';
import { getRadioTracks } from '../lib/catalog';
import { RailSkeleton } from '../components/Skeleton';
import { TrackRow } from '../components/TrackRow';
import { EmptyState } from '../components/EmptyState';
import { usePlayerStore } from '../state/player';
import type { RadioStation, Track } from '../lib/types';

export function RadioPage() {
  const { id } = useParams();
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<RadioStation | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ stations: RadioStation[] }>('/api/radio', { auth: false })
      .then((r) => setStations(r.stations))
      .catch(() => setStations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const stationId = Number(id);
    if (!stationId || stations.length === 0) return;
    const found = stations.find((s) => s.id === stationId) ?? null;
    setActive(found);
    if (!found) return;
    setTracksLoading(true);
    setError(null);
    getRadioTracks(found, 30)
      .then((t) => { setTracks(t); if (t.length === 0) setError('This station has no playable tracks right now. Try another station.'); })
      .catch(() => setError('Could not load this station. The provider may be temporarily unavailable.'))
      .finally(() => setTracksLoading(false));
  }, [id, stations]);

  const playStation = (station: RadioStation) => {
    setTracksLoading(true);
    setError(null);
    getRadioTracks(station, 30)
      .then((t) => {
        setTracks(t);
        setActive(station);
        if (t.length > 0) usePlayerStore.getState().playQueue(t, 0);
      })
      .catch(() => setError('Could not load this station. Try again in a moment.'))
      .finally(() => setTracksLoading(false));
  };

  return (
    <div className="pt-2">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <RadioIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Radio</h1>
          <p className="text-sm text-zinc-400">Continuous, hands-free listening — press play and let it run.</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-square rounded-2xl" />)}
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {stations.map((s) => (
              <button
                key={s.id}
                onClick={() => playStation(s)}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${active?.id === s.id ? 'border-accent-400/50 bg-brand-soft' : 'border-white/5 bg-ink-800 hover:bg-ink-700'}`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-gradient/80 text-white shadow-glow">
                  <RadioIcon className="h-7 w-7" />
                </div>
                <div className="mt-3 truncate font-bold">{s.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{s.description}</div>
                <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-white opacity-0 shadow-glow transition group-hover:opacity-100">
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </span>
              </button>
            ))}
          </div>

          {active && (
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold">{active.name}</h2>
                  <p className="text-xs text-zinc-400">Auto-continues to the next track</p>
                </div>
                {tracks.length > 0 && (
                  <button onClick={() => usePlayerStore.getState().playQueue(tracks, 0)} className="flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:opacity-90">
                    <Play className="h-4 w-4 fill-current" /> Play station
                  </button>
                )}
              </div>
              {tracksLoading ? (
                <RailSkeleton count={5} />
              ) : error ? (
                <EmptyState title="Station unavailable" message={error} />
              ) : (
                <div className="space-y-1">
                  {tracks.map((t) => (
                    <TrackRow key={`${t.provider}:${t.providerTrackId}`} track={t} context={tracks} showAlbum={false} />
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="mt-10 text-center text-[11px] text-zinc-600">
            Radio queues are built from legal providers and labelled per track. Preview tracks are 30-second samples.{' '}
            <Link to="/providers" className="underline hover:text-zinc-400">How streaming works</Link>
          </p>
        </>
      )}
    </div>
  );
}
