import { EmptyState } from "../components/EmptyState";
import { TrackRow } from "../components/TrackRow";
import { useLibrary } from "../store/library";
import { usePlayer } from "../store/player";

export function Favorites() {
  const favorites = useLibrary((s) => s.favorites);
  const playQueue = usePlayer((s) => s.playQueue);
  return (
    <div className="px-6 py-8">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-3xl">Liked songs</h1>
        {favorites.length > 0 && (
          <button className="rounded-full bg-ember text-ink px-4 py-2 text-sm font-semibold" onClick={() => playQueue(favorites, 0)}>
            Play all
          </button>
        )}
      </div>
      <div className="mt-6">
        {favorites.length === 0 ? (
          <EmptyState title="Your likes live here" body="Heart a track from Home or Search." />
        ) : (
          favorites.map((t, i) => <TrackRow key={t.id} track={t} queue={favorites} index={i} />)
        )}
      </div>
    </div>
  );
}
