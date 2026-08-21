import {
  ChevronDown,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayer } from "../store/player";
import { useLibrary } from "../store/library";
import { formatTime } from "../utils/format";
import { QueuePanel } from "./QueuePanel";

export function Player() {
  const p = usePlayer();
  const track = p.current();
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const fav = useLibrary((s) => (track ? s.favorites.some((t) => t.id === track.id) : false));

  if (!track) {
    return (
      <div className="h-20 border-t border-line bg-panel/90 px-4 flex items-center text-white/40 text-sm">
        Select a track to start listening. Catalog is independent CC / public-domain / Audius / Jamendo — not Spotify or YouTube.
      </div>
    );
  }

  const remain = Math.max(0, (p.duration || 0) - p.currentTime);

  return (
    <>
      <div className="border-t border-line bg-panel/95 backdrop-blur-xl">
        <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_2fr_1fr] items-center gap-3 px-3 py-2">
          <button
            className="flex min-w-0 items-center gap-3 text-left"
            onClick={() => p.setExpanded(true)}
            aria-label="Open full player"
          >
            <img src={track.artwork} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{track.title}</p>
              <p className="truncate text-sm text-white/50">{track.artist}</p>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(track);
              }}
              className="hidden sm:inline p-2"
              aria-label="Like"
            >
              <Heart size={16} className={fav ? "fill-ember text-ember" : "text-white/40"} />
            </span>
          </button>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              <button aria-label="Shuffle" onClick={p.toggleShuffle} className={p.shuffle ? "text-mint" : "text-white/50"}>
                <Shuffle size={16} />
              </button>
              <button aria-label="Previous" onClick={p.prev}>
                <SkipBack size={20} fill="white" />
              </button>
              <button
                aria-label={p.isPlaying ? "Pause" : "Play"}
                onClick={p.toggle}
                className="h-11 w-11 rounded-full bg-white text-ink flex items-center justify-center"
              >
                {p.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <button aria-label="Next" onClick={p.next}>
                <SkipForward size={20} fill="white" />
              </button>
              <button
                aria-label="Repeat"
                onClick={p.cycleRepeat}
                className={p.repeat !== "off" ? "text-mint" : "text-white/50"}
              >
                <Repeat size={16} />
              </button>
            </div>
            <div className="hidden md:flex w-full max-w-xl items-center gap-2 text-[11px] text-white/50">
              <span>{formatTime(p.currentTime)}</span>
              <input
                type="range"
                min={0}
                max={p.duration || 0}
                value={p.currentTime}
                onChange={(e) => p.seek(Number(e.target.value))}
                className="flex-1"
                aria-label="Seek"
              />
              <span>-{formatTime(remain)}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-end gap-2">
            <button aria-label="Queue" onClick={() => p.setQueueOpen(!p.queueOpen)}>
              <ListMusic size={18} className={p.queueOpen ? "text-mint" : "text-white/60"} />
            </button>
            <button aria-label="Mute" onClick={p.toggleMute}>
              {p.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={p.muted ? 0 : p.volume}
              onChange={(e) => p.setVolume(Number(e.target.value))}
              className="w-24"
              aria-label="Volume"
            />
          </div>
        </div>
        {p.error && <p className="px-4 pb-2 text-xs text-ember">{p.error}</p>}
      </div>
      {p.queueOpen && <QueuePanel />}
      {p.expanded && <FullPlayer />}
    </>
  );
}

function FullPlayer() {
  const p = usePlayer();
  const track = p.current();
  if (!track) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-gradient-to-b from-[#2a1840] to-ink flex flex-col items-center px-6 py-8">
      <button className="self-start" aria-label="Close" onClick={() => p.setExpanded(false)}>
        <ChevronDown />
      </button>
      <img src={track.artwork} alt="" className="mt-6 w-72 h-72 rounded-3xl object-cover shadow-glow" />
      <h2 className="mt-8 font-display text-2xl">{track.title}</h2>
      <p className="text-white/60">{track.artist}</p>
      <input
        type="range"
        className="mt-8 w-full max-w-md"
        min={0}
        max={p.duration || 0}
        value={p.currentTime}
        onChange={(e) => p.seek(Number(e.target.value))}
      />
      <div className="mt-6 flex items-center gap-6">
        <button onClick={p.prev} aria-label="Previous">
          <SkipBack fill="white" />
        </button>
        <button
          onClick={p.toggle}
          className="h-16 w-16 rounded-full bg-white text-ink flex items-center justify-center"
          aria-label="Play pause"
        >
          {p.isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
        </button>
        <button onClick={p.next} aria-label="Next">
          <SkipForward fill="white" />
        </button>
      </div>
    </div>
  );
}
