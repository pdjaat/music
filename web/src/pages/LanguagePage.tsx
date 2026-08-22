import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getLanguages, getLanguageTracks } from '../lib/catalog';
import { TrackRow } from '../components/TrackRow';
import { RowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import type { Language, Track } from '../lib/types';

export function LanguagePage() {
  const { id } = useParams();
  const [language, setLanguage] = useState<Language | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void (async () => {
      const languages = await getLanguages();
      const found = languages.find((l) => l.id === Number(id)) ?? null;
      setLanguage(found);
      if (!found) { setLoading(false); return; }
      try {
        setTracks(await getLanguageTracks(found.id, found.name));
      } catch {
        setError('Could not load this language right now.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="pt-2">
      <h1 className="text-2xl font-black tracking-tight">
        {language ? `${language.name_native} (${language.name})` : 'Language'}
      </h1>
      <p className="mt-1 text-sm text-zinc-400">Top {language?.name ?? ''} tracks from legal providers</p>
      <div className="mt-6">
        {loading ? <RowSkeleton count={8} /> : error ? <EmptyState title="Couldn’t load language" message={error} /> : tracks.length === 0 ? (
          <EmptyState title="No tracks found" message="This language has no available tracks from the current provider." />
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
