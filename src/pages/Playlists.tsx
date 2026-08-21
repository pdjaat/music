import { useState } from "react";
import { Shuffle } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { TrackRow } from "../components/TrackRow";
import { useLibrary } from "../store/library";
import { usePlayer } from "../store/player";
import { useToast } from "../components/Toast";

export function Playlists() {
  const { playlists, createPlaylist, renamePlaylist, deletePlaylist, removeFromPlaylist, reorderPlaylist } = useLibrary();
  const playQueue = usePlayer((s) => s.playQueue);
  const toast = useToast((s) => s.show);
  const [name, setName] = useState("");
  const [open, setOpen] = useState<string | null>(playlists[0]?.id ?? null);

  const current = playlists.find((p) => p.id === open);

  return (
    <div className="px-6 py-8">
      <h1 className="font-display text-3xl">Playlists</h1>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const p = createPlaylist(name.trim());
          setName("");
          setOpen(p.id);
          toast("Playlist created");
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New playlist name"
          className="rounded-xl bg-card border border-line px-3 py-2"
        />
        <button className="rounded-xl bg-ember text-ink px-4 font-semibold">Create</button>
      </form>
      {playlists.length === 0 && <div className="mt-8"><EmptyState title="Nothing here yet" body="Create a playlist to collect independent tracks." /></div>}
      <div className="mt-8 grid md:grid-cols-[220px_1fr] gap-6">
        <ul className="space-y-1">
          {playlists.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setOpen(p.id)}
                className={`w-full text-left rounded-xl px-3 py-2 ${open === p.id ? "bg-white/10" : "hover:bg-white/5"}`}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
        {current && (
          <div>
            <input
              defaultValue={current.name}
              key={current.id}
              onBlur={(e) => renamePlaylist(current.id, e.target.value)}
              className="bg-transparent font-display text-2xl w-full"
            />
            <div className="mt-3 flex gap-2">
              <button
                className="rounded-full bg-white text-ink px-4 py-2 text-sm font-semibold"
                onClick={() => playQueue(current.tracks, 0)}
              >
                Play
              </button>
              <button
                className="rounded-full bg-white/10 px-4 py-2 text-sm"
                onClick={() => playQueue([...current.tracks].sort(() => Math.random() - 0.5), 0)}
              >
                <Shuffle size={14} className="inline mr-1" /> Shuffle
              </button>
              <button
                className="rounded-full bg-red-500/20 text-red-200 px-4 py-2 text-sm"
                onClick={() => {
                  deletePlaylist(current.id);
                  toast("Playlist deleted");
                }}
              >
                Delete
              </button>
            </div>
            <div className="mt-4">
              {current.tracks.map((t, i) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => reorderPlaylist(current.id, Number(e.dataTransfer.getData("text/plain")), i)}
                >
                  <TrackRow track={t} queue={current.tracks} index={i} />
                  <button className="text-xs text-white/40 ml-16" onClick={() => removeFromPlaylist(current.id, t.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
