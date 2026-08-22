import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Edit3, ListMusic, Pause, Play, Plus, Share2, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../state/auth';
import { usePlayerStore } from '../state/player';
import { TrackRow } from '../components/TrackRow';
import { RowSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { toastError, toastSuccess } from '../state/toasts';
import type { PlaylistDetail } from '../lib/types';

export function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api<{ playlist: PlaylistDetail }>(`/api/me/playlists/${id}`);
      setPlaylist(data.playlist);
      setName(data.playlist.name);
      setIsPublic(data.playlist.isPublic);
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not load this playlist.');
      navigate('/library');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <div className="pt-2"><RowSkeleton count={8} /></div>;
  }
  if (!playlist) return null;

  const isOwner = user?.id !== undefined;

  const playAll = () => {
    if (playlist.tracks.length > 0) usePlayerStore.getState().playQueue(playlist.tracks, 0);
  };

  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/me/playlists/${playlist.id}`, { method: 'PATCH', body: { name, isPublic } });
      toastSuccess('Playlist updated');
      setEditing(false);
      void load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${playlist.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/me/playlists/${playlist.id}`, { method: 'DELETE' });
      toastSuccess('Playlist deleted');
      navigate('/library');
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not delete playlist.');
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/playlist/${playlist.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toastSuccess('Link copied');
    } catch {
      toastError('Could not copy link.');
    }
  };

  return (
    <div className="pt-2">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-3xl bg-brand-soft shadow-card">
          <ListMusic className="h-16 w-16 text-accent-400/80" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Playlist</p>
          {editing ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-xl font-black outline-none focus:border-accent-400/50" />
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-orange-500" /> Public
              </label>
              <button onClick={save} disabled={busy} className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Save</button>
              <button onClick={() => setEditing(false)} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Cancel</button>
            </div>
          ) : (
            <h1 className="truncate text-3xl font-black tracking-tight">{playlist.name}</h1>
          )}
          <p className="mt-1 text-sm text-zinc-400">
            {isOwner ? 'You' : playlist.name} · {playlist.trackCount} tracks · {playlist.isPublic ? 'Public' : 'Private'}
          </p>
          {playlist.description && <p className="mt-1 text-sm text-zinc-400">{playlist.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={playAll} disabled={playlist.tracks.length === 0} className="flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-40">
              <Play className="h-4 w-4 fill-current" /> Play
            </button>
            <button onClick={() => setEditing(true)} className="btn-icon border border-white/10" aria-label="Rename"><Edit3 className="h-4 w-4" /></button>
            <button onClick={share} className="btn-icon border border-white/10" aria-label="Share"><Share2 className="h-4 w-4" /></button>
            <button onClick={remove} className="btn-icon border border-white/10 hover:!text-rose-400" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {playlist.tracks.length === 0 ? (
          <EmptyState
            icon={<ListMusic className="h-8 w-8" />}
            title="This playlist is empty"
            message="Add songs from search results, albums or the home feed."
            action={<Link to="/search" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/15"><Plus className="mr-1 inline h-4 w-4" />Find songs</Link>}
          />
        ) : (
          <div className="space-y-1">
            {playlist.tracks.map((t) => (
              <TrackRow key={`${t.provider}:${t.providerTrackId}`} track={t} context={playlist.tracks} showIndex onPlaylistChange={() => void load()} />
            ))}
          </div>
        )}
      </div>
      <span className="sr-only"><X /></span>
    </div>
  );
}
