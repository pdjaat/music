import { useEffect, useState } from 'react';
import { Check, Copy, ListPlus, Plus, X } from 'lucide-react';
import { useUiStore } from '../state/ui';
import { useAuthStore } from '../state/auth';
import { api } from '../lib/api';
import { toastError, toastSuccess } from '../state/toasts';
import { SignInPrompt } from './SignInPrompt';
import type { PlaylistSummary, Track } from '../lib/types';

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-850 p-5 shadow-card animate-fadeUp sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PlaylistPickerModal() {
  const { playlistPicker, closePlaylistPicker } = useUiStore();
  const user = useAuthStore((s) => s.user);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const track = playlistPicker.track;

  useEffect(() => {
    if (!playlistPicker.open || !user) return;
    setLoading(true);
    api<{ playlists: PlaylistSummary[] }>('/api/me/playlists')
      .then((r) => setPlaylists(r.playlists))
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false));
  }, [playlistPicker.open, user]);

  if (!playlistPicker.open) return null;

  const addTo = async (playlistId: number) => {
    if (!track) return;
    try {
      const body = track.id ? { songId: track.id } : { track };
      await api('/api/me/playlists/' + playlistId + '/songs', { method: 'POST', body });
      toastSuccess('Added to playlist');
      closePlaylistPicker();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not add to playlist.');
    }
  };

  const createAndAdd = async () => {
    if (!track || !newName.trim()) return;
    setCreating(true);
    try {
      const { playlist } = await api<{ playlist: PlaylistSummary }>('/api/me/playlists', { method: 'POST', body: { name: newName.trim() } });
      await addTo(playlist.id);
      setNewName('');
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not create playlist.');
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return (
      <ModalShell title="Add to playlist" onClose={closePlaylistPicker}>
        <SignInPrompt message="Sign in to save this song to one of your playlists." />
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Add to playlist" onClose={closePlaylistPicker}>
      <div className="space-y-2">
        {loading && <p className="py-4 text-center text-sm text-zinc-400">Loading your playlists…</p>}
        {playlists.map((p) => (
          <button key={p.id} onClick={() => addTo(p.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.07]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-accent-400"><ListPlus className="h-4.5 w-4.5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{p.name}</span>
              <span className="block text-xs text-zinc-400">{p.trackCount} tracks</span>
            </span>
          </button>
        ))}
        {playlists.length === 0 && !loading && <p className="py-2 text-center text-sm text-zinc-400">You don&apos;t have any playlists yet.</p>}
        <div className="flex gap-2 pt-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
            placeholder="New playlist name"
            maxLength={100}
            className="flex-1 rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5 text-sm outline-none transition focus:border-accent-400/50"
          />
          <button onClick={createAndAdd} disabled={creating || !newName.trim()} className="flex items-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40">
            <Plus className="h-4 w-4" /> Create
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ShareModal() {
  const { shareTrack, closeShare } = useUiStore();
  const [copied, setCopied] = useState(false);
  if (!shareTrack) return null;

  const shareUrl = shareTrack.providerUrl ?? (shareTrack.id ? `${window.location.origin}/song/${shareTrack.id}` : '');
  const text = `${shareTrack.title} — ${shareTrack.artistName} on Sangeet`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl || text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toastError('Could not copy to clipboard.');
    }
  };

  return (
    <ModalShell title="Share" onClose={closeShare}>
      <p className="text-sm text-zinc-400">{text}</p>
      {shareUrl && <p className="mt-1 break-all text-xs text-zinc-500">{shareUrl}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={copy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/15">
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied!' : 'Copy link'}
        </button>
        {shareTrack.providerUrl && (
          <a href={shareTrack.providerUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
            Open source
          </a>
        )}
      </div>
      <p className="mt-3 text-center text-[11px] text-zinc-500">
        {shareTrack.stream.attribution ?? `Streamed via ${shareTrack.provider}`}
        {shareTrack.stream.isPreview ? ' · 30s preview' : ''}
      </p>
    </ModalShell>
  );
}
