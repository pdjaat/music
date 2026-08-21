import { Play } from "lucide-react";

export function CoverCard({
  title,
  subtitle,
  artwork,
  onPlay,
  onOpen,
}: {
  title: string;
  subtitle?: string;
  artwork: string;
  onPlay?: () => void;
  onOpen?: () => void;
}) {
  return (
    <button
      onClick={onOpen ?? onPlay}
      className="group text-left rounded-2xl bg-card p-3 hover:bg-white/5 transition"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl shadow-lg">
        <img src={artwork} alt="" className="h-full w-full object-cover" loading="lazy" />
        {onPlay && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="absolute bottom-3 right-3 hidden h-11 w-11 items-center justify-center rounded-full bg-ember text-ink shadow-lg group-hover:flex"
          >
            <Play size={18} fill="currentColor" />
          </span>
        )}
      </div>
      <p className="mt-3 truncate font-semibold">{title}</p>
      {subtitle && <p className="truncate text-sm text-white/50">{subtitle}</p>}
    </button>
  );
}
