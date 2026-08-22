import { ListMusic, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { usePlayerStore } from '../state/player';
import { useUiStore } from '../state/ui';
import { Artwork } from './Artwork';
import { formatDuration } from '../lib/text';

export function PlayerBar() {
  const {
    current, isPlaying, togglePlay, next, prev, seek, position, duration,
    volume, muted, setVolume, toggleMute, shuffle, toggleShuffle, repeat, cycleRepeat,
    setFullPlayerOpen,
  } = usePlayerStore();
  const theme = useUiStore((s) => s.theme);

  if (!current) return null;

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/5 bg-ink-900/95 backdrop-blur-xl lg:bottom-0" style={{ height: 'var(--player-bar-h, 72px)' }} id="player-bar">
      <div className="group flex h-full items-center gap-3 px-3 sm:px-4">
        {/* seek track */}
        <input
          type="range"
          className="slider absolute inset-x-0 top-[-2px] !h-[3px] w-full cursor-pointer"
          min={0}
          max={duration || 100}
          step={0.1}
          value={Math.min(position, duration || 0)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
        />

        {/* track info */}
        <button onClick={() => setFullPlayerOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left sm:flex-none sm:w-72">
          <div className="relative">
            <Artwork src={current.artworkUrl} alt={current.title} className="h-12 w-12" rounded="rounded-lg" />
            {current.stream.isPreview && (
              <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1 text-[8px] font-black text-black">30s</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{current.title}</div>
            <div className="truncate text-xs text-zinc-400">{current.artistName}</div>
          </div>
        </button>

        {/* controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={toggleShuffle} className={`btn-icon hidden sm:block ${shuffle ? '!text-accent-400' : ''}`} aria-label="Shuffle" title="Shuffle">
            <Shuffle className="h-4 w-4" />
          </button>
          <button onClick={() => prev()} className="btn-icon" aria-label="Previous" title="Previous"><SkipBack className="h-5 w-5 fill-current" /></button>
          <button
            onClick={togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-950 transition hover:scale-105 active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
          </button>
          <button onClick={() => next()} className="btn-icon" aria-label="Next" title="Next"><SkipForward className="h-5 w-5 fill-current" /></button>
          <button onClick={cycleRepeat} className={`btn-icon hidden sm:block ${repeat !== 'off' ? '!text-accent-400' : ''}`} aria-label="Repeat" title={`Repeat: ${repeat}`}>
            {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </button>
        </div>

        {/* time + volume */}
        <div className="ml-auto hidden items-center gap-3 md:flex">
          <span className="w-16 text-right text-[11px] tabular-nums text-zinc-500">{formatDuration(position)} / {formatDuration(duration)}</span>
          <button onClick={toggleMute} className="btn-icon !p-1" aria-label="Mute">{muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
          <input
            type="range"
            className="slider w-24"
            min={0} max={1} step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
          />
          <button onClick={() => setFullPlayerOpen(true)} className="btn-icon !p-1.5" aria-label="Open full player" title="Full player">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* mobile: queue button */}
        <button onClick={() => setFullPlayerOpen(true)} className="btn-icon md:hidden" aria-label="Now playing">
          <ListMusic className="h-5 w-5" />
        </button>
      </div>
      <span className="sr-only">{theme}</span>
    </div>
  );
}
