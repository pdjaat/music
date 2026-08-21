import { Trash2, X } from "lucide-react";
import { usePlayer } from "../store/player";

export function QueuePanel() {
  const { queue, index, removeFromQueue, clearQueue, setQueueOpen, playQueue, moveQueue } = usePlayer();
  return (
    <aside className="fixed right-0 top-0 bottom-20 z-50 w-full max-w-md bg-panel border-l border-line p-4 overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg">Queue</h2>
        <div className="flex gap-2">
          <button onClick={clearQueue} className="text-sm text-white/50">
            Clear
          </button>
          <button aria-label="Close queue" onClick={() => setQueueOpen(false)}>
            <X size={18} />
          </button>
        </div>
      </div>
      {queue.map((t, i) => (
        <div
          key={`${t.id}-${i}`}
          draggable
          onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const from = Number(e.dataTransfer.getData("text/plain"));
            moveQueue(from, i);
          }}
          className={`flex items-center gap-3 rounded-xl p-2 ${i === index ? "bg-white/10" : "hover:bg-white/5"}`}
        >
          <button className="flex flex-1 min-w-0 items-center gap-3 text-left" onClick={() => playQueue(queue, i)}>
            <img src={t.artwork} alt="" className="h-10 w-10 rounded object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t.title}</p>
              <p className="truncate text-xs text-white/50">{t.artist}</p>
            </div>
          </button>
          <button aria-label="Remove" onClick={() => removeFromQueue(i)}>
            <Trash2 size={14} className="text-white/40" />
          </button>
        </div>
      ))}
    </aside>
  );
}
