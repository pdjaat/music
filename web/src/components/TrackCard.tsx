import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';
import { Artwork } from './Artwork';
import { ProviderBadge } from './ProviderBadge';
import { usePlayerStore } from '../state/player';
import { useUiStore } from '../state/ui';
import { MoreVertical } from 'lucide-react';
import type { Album, Artist, ProviderPlaylist, Track } from '../lib/types';

interface TrackCardProps {
  track: Track;
  onClick?: () => void;
}

export const TrackCard = memo(function TrackCard({ track, onClick }: TrackCardProps) {
  const { current, isPlaying, playTrack, playQueue } = usePlayerStore();
  const openPlaylistPicker = useUiStore((s) => s.openPlaylistPicker);
  const openShare = useUiStore((s) => s.openShare);
  const [hover, setHover] = useState(false);
  const isCurrent = current?.providerTrackId === track.providerTrackId && current?.provider === track.provider;
  const playing = isCurrent && isPlaying;

  return (
    <div
      className="group w-40 shrink-0 snap-start sm:w-44"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        onClick={onClick ?? (() => (isCurrent ? usePlayerStore.getState().togglePlay() : playQueue([track], 0)))}
        className="relative block w-full"
        aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        <Artwork src={track.artworkUrl} alt={track.title} className="aspect-square w-full shadow-card" rounded="rounded-2xl" />
        <span
          className={`absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow transition-all duration-200 ${
            playing ? 'opacity-100' : hover ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
        >
          {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
        </span>
      </button>
      <div className="mt-2 flex items-start justify-between gap-1">
        <div className="min-w-0">
          {track.id ? (
            <Link to={`/song/${track.id}`} className="block truncate text-sm font-semibold hover:underline">{track.title}</Link>
          ) : (
            <span className="block truncate text-sm font-semibold">{track.title}</span>
          )}
          <Link to={`/artist/${track.provider}/${encodeURIComponent(track.providerTrackId)}`} className="block truncate text-xs text-zinc-400 hover:text-zinc-200">{track.artistName}</Link>
        </div>
        <MoreButton
          track={track}
          onAddToPlaylist={() => openPlaylistPicker(track)}
          onShare={() => openShare(track)}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100"
        />
      </div>
      <ProviderBadge track={track} className="mt-1" compact />
    </div>
  );
});

export function AlbumCard({ album }: { album: Album }) {
  return (
    <Link to={`/album/${album.provider}/${encodeURIComponent(album.providerAlbumId)}`} className="group w-40 shrink-0 snap-start sm:w-44">
      <Artwork src={album.coverUrl} alt={album.title} className="aspect-square w-full shadow-card transition group-hover:scale-[1.02]" rounded="rounded-2xl" />
      <div className="mt-2 truncate text-sm font-semibold group-hover:underline">{album.title}</div>
      <div className="truncate text-xs text-zinc-400">{album.artistName}</div>
    </Link>
  );
}

export function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link to={`/artist/${artist.provider}/${encodeURIComponent(artist.providerArtistId)}`} className="group w-36 shrink-0 snap-start sm:w-40">
      <Artwork src={artist.imageUrl} alt={artist.name} className="aspect-square w-full rounded-full shadow-card transition group-hover:scale-[1.03]" rounded="rounded-full" />
      <div className="mt-2 truncate text-center text-sm font-semibold group-hover:underline">{artist.name}</div>
      <div className="text-center text-xs text-zinc-400">Artist</div>
    </Link>
  );
}

export function PlaylistCard({ playlist }: { playlist: ProviderPlaylist }) {
  return (
    <Link to={`/provider-playlist/${playlist.provider}/${encodeURIComponent(playlist.providerPlaylistId)}`} className="group w-40 shrink-0 snap-start sm:w-44">
      <Artwork src={playlist.coverUrl} alt={playlist.title} className="aspect-square w-full shadow-card transition group-hover:scale-[1.02]" rounded="rounded-2xl" />
      <div className="mt-2 truncate text-sm font-semibold group-hover:underline">{playlist.title}</div>
      <div className="truncate text-xs text-zinc-400">{playlist.owner ?? `${playlist.trackCount ?? 0} tracks`}</div>
    </Link>
  );
}

export function MoreButton({ track, onAddToPlaylist, onShare, className = '' }: {
  track: Track;
  onAddToPlaylist?: () => void;
  onShare?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const addToPlaylist = () => { setOpen(false); onAddToPlaylist?.(); };
  const share = () => { setOpen(false); onShare?.(); };

  return (
    <div className="relative">
      <button
        className={`btn-icon !p-1.5 ${className}`}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-label={`More options for ${track.title}`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-44 overflow-hidden rounded-xl border border-white/10 bg-ink-800 py-1 text-sm shadow-card animate-fadeUp">
            <button onClick={addToPlaylist} className="block w-full px-3 py-2 text-left hover:bg-white/10">Add to playlist</button>
            <button onClick={share} className="block w-full px-3 py-2 text-left hover:bg-white/10">Share</button>
          </div>
        </>
      )}
    </div>
  );
}
