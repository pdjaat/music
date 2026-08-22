import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Disc3, Heart, ListMusic, Mic2, Play } from 'lucide-react';
import { useAuthStore } from '../state/auth';
import { api } from '../lib/api';
import { TrackRow } from '../components/TrackRow';
import { RowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { SignInPrompt } from '../components/SignInPrompt';
import { usePlayerStore } from '../state/player';
import type { PlaylistSummary, Track } from '../lib/types';

type Tab = 'playlists' | 'liked' | 'albums' | 'artists';

export function LibraryPage({ tab: initialTab = 'playlists' }: { tab?: Tab }) {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [liked, setLiked] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Array<{ title: string; artist: string; cover: string | null; tracks: Track[] }>>([]);
  const [artists, setArtists] = useState<Array<{ name: string; cover: string | null; tracks: Track[] }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [pl, lk] = await Promise.all([
        api<{ playlists: PlaylistSummary[] }>('/api/me/playlists'),
        api<{ tracks: Track[] }>('/api/me/liked'),
      ]);
      setPlaylists(pl.playlists);
      setLiked(lk.tracks);
      const albumMap = new Map<string, { title: string; artist: string; cover: string | null; tracks: Track[] }>();
      const artistMap = new Map<string, { name: string; cover: string | null; tracks: Track[] }>();
      for (const t of lk.tracks) {
        const ak = `${t.albumName ?? ''}::${t.artistName}`;
        if (t.albumName) {
          if (!albumMap.has(ak)) albumMap.set(ak, { title: t.albumName, artist: t.artistName, cover: t.artworkUrl ?? null, tracks: [] });
          albumMap.get(ak)!.tracks.push(t);
        }
        const sk = t.artistName;
        if (!artistMap.has(sk)) artistMap.set(sk, { name: t.artistName, cover: t.artworkUrl ?? null, tracks: [] });
        artistMap.get(sk)!.tracks.push(t);
      }
      setAlbums([...albumMap.values()].slice(0, 40));
      setArtists([...artistMap.values()].slice(0, 40));
    } catch {
      // ignore — empty states show
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => { void load(); }, [load]);

  if (!user) {
    return (
      <div className="pt-4">
        <h1 className="mb-6 text-2xl font-black">Your Library</h1>
        <SignInPrompt />
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: 'playlists', label: 'Playlists', count: playlists.length },
    { id: 'liked', label: 'Liked Songs', count: liked.length },
    { id: 'albums', label: 'Albums', count: albums.length },
    { id: 'artists', label: 'Artists', count: artists.length },
  ];

  return (
    <div className="pt-2">
      <h1 className="mb-4 text-2xl font-black tracking-tight">Your Library</h1>
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === t.id ? 'bg-white/12 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            {t.label}{t.count !== undefined && <span className="ml-1 text-xs text-zinc-500">({t.count})</span>}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <RowSkeleton count={6} />
        ) : tab === 'playlists' ? (
          playlists.length === 0 ? (
            <EmptyState icon={<ListMusic className="h-8 w-8" />} title="No playlists yet" message="Create one and add your favourite Indian tracks." action={<CreatePlaylistButton onCreated={() => void load()} />} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {playlists.map((p) => (
                <Link key={p.id} to={`/playlist/${p.id}`} className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-ink-800 p-3 transition hover:bg-ink-700">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-brand-soft">
                    <ListMusic className="h-6 w-6 text-accent-400" />
                    <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition group-hover:opacity-100">
                      <Play className="ml-0.5 h-5 w-5 fill-current" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-bold">{p.name}</div>
                    <div className="text-xs text-zinc-400">{p.trackCount} tracks · {p.isPublic ? 'public' : 'private'}</div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : tab === 'liked' ? (
          liked.length === 0 ? (
            <EmptyState icon={<Heart className="h-8 w-8 text-rose2-400" />} title="No liked songs yet" message="Tap the heart on any track to save it here." />
          ) : (
            <div className="space-y-1">
              {liked.map((t) => (
                <TrackRow key={`${t.provider}:${t.providerTrackId}`} track={t} context={liked} onPlaylistChange={() => void load()} />
              ))}
            </div>
          )
        ) : tab === 'albums' ? (
          albums.length === 0 ? (
            <EmptyState icon={<Disc3 className="h-8 w-8" />} title="No albums yet" message="Songs you like are grouped into albums here." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((a) => (
                <button key={a.title + a.artist} onClick={() => usePlayerStore.getState().playQueue(a.tracks, 0)} className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-ink-800 p-3 text-left transition hover:bg-ink-700">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                    <img src={a.cover ?? ''} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-bold">{a.title}</div>
                    <div className="truncate text-xs text-zinc-400">{a.artist} · {a.tracks.length} songs</div>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : artists.length === 0 ? (
          <EmptyState icon={<Mic2 className="h-8 w-8" />} title="No artists yet" message="Artists from your liked songs appear here." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((a) => (
              <button key={a.name} onClick={() => usePlayerStore.getState().playQueue(a.tracks, 0)} className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-ink-800 p-3 text-left transition hover:bg-ink-700">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft">
                  {a.cover ? <img src={a.cover} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} /> : <Mic2 className="h-6 w-6 text-accent-400" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-bold">{a.name}</div>
                  <div className="text-xs text-zinc-400">{a.tracks.length} songs</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePlaylistButton({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col items-center gap-2">
      {open ? (
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Playlist name" maxLength={100}
            className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-accent-400/50" autoFocus />
          <button
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await api('/api/me/playlists', { method: 'POST', body: { name: name.trim() } });
                setName('');
                setOpen(false);
                onCreated();
              } finally { setBusy(false); }
            }}
            className="rounded-xl bg-brand-gradient px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Create
          </button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/15">
          + New playlist
        </button>
      )}
    </div>
  );
}
