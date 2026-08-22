import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, ExternalLink, ListMusic, Music2, Pause, Play, Radio, Repeat, Repeat1,
  Shuffle, SkipBack, SkipForward, Volume2, VolumeX,
} from 'lucide-react';
import { usePlayerStore } from '../state/player';
import { Artwork } from './Artwork';
import { ProviderBadge } from './ProviderBadge';
import { formatDuration } from '../lib/text';
import { trackRadio } from '../lib/catalog';
import { toastError } from '../state/toasts';
import type { Track } from '../lib/types';

export function FullPlayer() {
  const {
    fullPlayerOpen, setFullPlayerOpen, current, queue, queueIndex, isPlaying, togglePlay,
    next, prev, seek, position, duration, volume, muted, setVolume, toggleMute,
    shuffle, toggleShuffle, repeat, cycleRepeat,
  } = usePlayerStore();
  const [tab, setTab] = useState<'queue' | 'lyrics' | 'radio'>('queue');
  const [radioTracks, setRadioTracks] = useState<Track[]>([]);
  const [radioLoading, setRadioLoading] = useState(false);

  useEffect(() => {
    if (fullPlayerOpen && current && tab === 'radio' && radioTracks.length === 0) {
      setRadioLoading(true);
      trackRadio(current, 15)
        .then(setRadioTracks)
        .catch(() => toastError('Radio for this track is unavailable right now.'))
        .finally(() => setRadioLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullPlayerOpen, tab, current?.providerTrackId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFullPlayerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setFullPlayerOpen]);

  if (!fullPlayerOpen || !current) return null;

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const upNext = queue[queueIndex + 1];

  const playFromRadio = (t: Track, list: Track[]) => {
    usePlayerStore.getState().playQueue([t, ...list.filter((x) => x.providerTrackId !== t.providerTrackId)], 0);
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-ink-950/98 backdrop-blur-2xl animate-fadeUp">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-8">
        <button onClick={() => setFullPlayerOpen(false)} className="btn-icon" aria-label="Close player"><ChevronDown className="h-6 w-6" /></button>
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Now Playing</div>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-8 sm:flex-row sm:items-center sm:justify-center sm:gap-14 sm:px-12">
        {/* artwork */}
        <div className="relative mx-auto w-full max-w-[320px] sm:w-[38vmin] sm:max-w-[420px]">
          <div className="absolute -inset-8 -z-10 rounded-full bg-brand-soft blur-3xl" />
          <Artwork
            src={current.artworkUrl}
            alt={current.title}
            className={`aspect-square w-full shadow-glow ${isPlaying ? 'animate-spinSlow rounded-full' : 'rounded-3xl'}`}
            rounded={isPlaying ? 'rounded-full' : 'rounded-3xl'}
          />
          {current.stream.isPreview && (
            <span className="absolute -top-1 right-2 rounded-full border border-amber-400/30 bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              30s preview
            </span>
          )}
        </div>

        {/* details + controls */}
        <div className="flex w-full max-w-xl flex-col gap-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{current.title}</h1>
              <ProviderBadge track={current} />
            </div>
            <p className="mt-1 text-zinc-400">
              <Link to={`/artist/${current.provider}/${encodeURIComponent(current.providerTrackId)}`} className="font-semibold text-zinc-200 hover:underline">{current.artistName}</Link>
              {current.albumName && <> · {current.albumName}</>}
            </p>
            {current.stream.attribution && <p className="mt-2 text-[11px] text-zinc-500">{current.stream.attribution}</p>}
            {current.provider === 'youtube' && current.providerUrl && (
              <a href={current.providerUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10">
                <ExternalLink className="h-3.5 w-3.5" /> Watch on YouTube
              </a>
            )}
          </div>

          {/* seek */}
          <div>
            <input type="range" className="slider w-full" min={0} max={duration || 100} step={0.1} value={Math.min(position, duration || 0)} onChange={(e) => seek(Number(e.target.value))} aria-label="Seek" />
            <div className="mt-1 flex justify-between text-xs tabular-nums text-zinc-500">
              <span>{formatDuration(position)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* controls */}
          <div className="flex items-center justify-between">
            <button onClick={toggleShuffle} className={`btn-icon ${shuffle ? '!text-accent-400' : ''}`} aria-label="Shuffle"><Shuffle className="h-5 w-5" /></button>
            <button onClick={() => prev()} className="btn-icon" aria-label="Previous"><SkipBack className="h-8 w-8 fill-current" /></button>
            <button onClick={togglePlay} className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow transition hover:scale-105 active:scale-95" aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
            </button>
            <button onClick={() => next()} className="btn-icon" aria-label="Next"><SkipForward className="h-8 w-8 fill-current" /></button>
            <button onClick={cycleRepeat} className={`btn-icon ${repeat !== 'off' ? '!text-accent-400' : ''}`} aria-label="Repeat">
              {repeat === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
            </button>
          </div>

          {/* volume */}
          <div className="flex items-center gap-3">
            <button onClick={toggleMute} className="btn-icon !p-1" aria-label="Mute">{muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
            <input type="range" className="slider flex-1" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" />
          </div>
        </div>
      </div>

      {/* bottom panel: queue / lyrics / radio */}
      <div className="border-t border-white/5 bg-ink-900/60">
        <div className="flex gap-1 px-4 pt-3 sm:px-8">
          {([['queue', 'Queue'], ['lyrics', 'Lyrics'], ['radio', 'Track radio']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="max-h-48 overflow-y-auto px-4 py-3 sm:px-8">
          {tab === 'queue' && (
            queue.length === 0 ? <p className="py-4 text-center text-sm text-zinc-500">Queue is empty.</p> : (
              <div className="space-y-1">
                {queue.map((t, i) => (
                  <div key={`${t.provider}:${t.providerTrackId}`} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${i === queueIndex ? 'bg-white/[0.08] text-white' : 'text-zinc-400'}`}>
                    <span className="w-5 text-right text-xs tabular-nums">{i + 1}</span>
                    <Artwork src={t.artworkUrl} alt="" className="h-8 w-8" rounded="rounded-md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{t.title}</div>
                      <div className="truncate text-xs">{t.artistName}</div>
                    </div>
                    {t.stream.isPreview && <span className="text-[9px] font-bold uppercase text-amber-400">preview</span>}
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'lyrics' && (
            current.lyrics ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300">{current.lyrics}</pre>
            ) : (
              <p className="py-4 text-center text-sm text-zinc-500">
                Lyrics are only shown when legally available from the provider. This track has no lyrics.
              </p>
            )
          )}
          {tab === 'radio' && (
            radioLoading ? <p className="py-4 text-center text-sm text-zinc-500">Finding similar tracks…</p> : radioTracks.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">Track radio is unavailable for this provider right now.</p>
            ) : (
              <div className="grid gap-1 sm:grid-cols-2">
                {radioTracks.map((t) => (
                  <button key={t.providerTrackId} onClick={() => playFromRadio(t, radioTracks)} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-white/[0.07]">
                    <Artwork src={t.artworkUrl} alt="" className="h-8 w-8" rounded="rounded-md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-zinc-200">{t.title}</div>
                      <div className="truncate text-xs text-zinc-500">{t.artistName}</div>
                    </div>
                    <Radio className="h-3.5 w-3.5 text-accent-400" />
                  </button>
                ))}
              </div>
            )
          )}
        </div>
        {upNext && (
          <div className="flex items-center gap-3 border-t border-white/5 px-4 py-2.5 text-xs text-zinc-500 sm:px-8">
            <ListMusic className="h-4 w-4 shrink-0" />
            <span className="font-bold text-zinc-400">Up next:</span>
            <span className="truncate">{upNext.title} — {upNext.artistName}</span>
            {current.stream.isPreview && <Music2 className="ml-auto h-3.5 w-3.5 opacity-50" />}
          </div>
        )}
      </div>
    </div>
  );
}
