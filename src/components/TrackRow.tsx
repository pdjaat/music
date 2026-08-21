import { Heart, ListPlus, Play, Plus } from "lucide-react";
import type { Track } from "../types/music";
import { usePlayer } from "../store/player";
import { useLibrary } from "../store/library";
import { useToast } from "./Toast";
import { formatTime } from "../utils/format";

export function TrackRow({
  track,
  queue,
  index,
}: {
  track: Track;
  queue: Track[];
  index?: number;
}) {
  const playTrack = usePlayer((s) => s.playTrack);
  const addToQueue = usePlayer((s) => s.addToQueue);
  const playNext = usePlayer((s) => s.playNext);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const fav = useLibrary((s) => s.favorites.some((t) => t.id === track.id));
  const toast = useToast((s) => s.show);

  return (
    <div className="group grid grid-cols-[auto_1fr_auto] md:grid-cols-[40px_48px_1fr_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
      <span className="hidden md:block w-6 text-center text-xs text-white/40">{(index ?? 0) + 1}</span>
      <button
        className="relative h-12 w-12 overflow-hidden rounded-lg"
        onClick={() => playTrack(track, queue)}
        aria-label={`Play ${track.title}`}
      >
        <img src={track.artwork} alt="" className="h-full w-full object-cover" loading="lazy" />
        <span className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
          <Play size={16} fill="white" />
        </span>
      </button>
      <div className="min-w-0">
        <p className="truncate font-semibold">{track.title}</p>
        <p className="truncate text-sm text-white/50">{track.artist}</p>
      </div>
      <p className="hidden md:block truncate text-sm text-white/40">{track.album}</p>
      <div className="flex items-center gap-1">
        <span className="hidden sm:inline text-xs text-white/40 w-10 text-right">
          {track.duration ? formatTime(track.duration) : ""}
        </span>
        <button
          aria-label={fav ? "Unlike" : "Like"}
          onClick={() => toggleFavorite(track)}
          className="p-2 rounded-full hover:bg-white/10"
        >
          <Heart size={16} className={fav ? "fill-ember text-ember" : "text-white/50"} />
        </button>
        <button
          aria-label="Add to queue"
          onClick={() => {
            addToQueue(track);
            toast("Added to queue");
          }}
          className="p-2 rounded-full hover:bg-white/10 text-white/50"
        >
          <ListPlus size={16} />
        </button>
        <button
          aria-label="Play next"
          onClick={() => {
            playNext(track);
            toast("Playing next");
          }}
          className="p-2 rounded-full hover:bg-white/10 text-white/50"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
