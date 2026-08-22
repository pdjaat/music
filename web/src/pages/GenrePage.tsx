import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getGenres, getGenreTracks } from '../lib/catalog';
import { TrackRow } from '../components/TrackRow';
import { RowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import type { Genre, Track } from '../lib/types';

export function GenrePage() {
  const { slug = '' } = useParams();
  const [genre, setGenre] = useState<Genre | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void (async () => {
      const genres = await getGenres();
      const found = genres.find((g) => g.slug === slug) ?? null;
      setGenre(found);
      if (!found) { setLoading(false); return; }
      try {
        setTracks(await getGenreTracks(found.slug, found.name));
      } catch {
        setError('Could not load this genre right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  return (
    <div className="pt-2">
      <h1 className="text-2xl font-black tracking-tight">{genre ? `${genre.name} ${genre.name_native !== genre.name ? `· ${genre.name_native}` : ''}` : 'Genre'}</h1>
      <p className="mt-1 text-sm text-zinc-400">{genre ? `${genre.name} music from legal providers` : 'Loading…'}</p>
      <div className="mt-6">
        {loading ? <RowSkeleton count={8} /> : error ? <EmptyState title="Couldn’t load genre" message={error} /> : tracks.length === 0 ? (
          <EmptyState title="No tracks found" message="This genre has no available tracks from the current provider." />
        ) : (
          <div className="space-y-1">
            {tracks.map((t) => (
              <TrackRow key={`${t.provider}:${t.providerTrackId}`} track={t} context={tracks} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
