import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Pause, Play } from 'lucide-react';
import { Artwork } from './Artwork';
import { ProviderBadge } from './ProviderBadge';
import { MoreButton } from './TrackCard';
import { usePlayerStore } from '../state/player';
import { useUiStore } from '../state/ui';
import { useAuthStore } from '../state/auth';
import { api } from '../lib/api';
import { toastError, toastSuccess } from '../state/toasts';
import { formatDuration } from '../lib/text';
import type { Track } from '../lib/types';

interface TrackRowProps {
  track: Track;
  index?: number;
  context?: Track[];
  showAlbum?: boolean;
  showIndex?: boolean;
  onPlaylistChange?: () => void;
}

export const TrackRow = memo(function TrackRow({ track, index, context, showAlbum = true, showIndex = false, onPlaylistChange }: TrackRowProps) {
  const { current, isPlaying, playQueue, togglePlay } = usePlayerStore();
  const openPlaylistPicker = useUiStore((s) => s.openPlaylistPicker);
  const openShare = useUiStore((s) => s.openShare);
  const user = useAuthStore((s) => s.user);
  const [liked, setLiked] = useState(Boolean(track.liked));
  const [hover, setHover] = useState(false);

  const isCurrent = current?.providerTrackId === track.providerTrackId && current?.provider === track.provider;
  const playing = isCurrent && isPlaying;
  const playable = track.playable !== false && (track.stream.kind === 'url' || track.stream.kind === 'youtube');

  const handlePlay = () => {
    if (!playable) {
      toastError(track.stream.attribution || 'This track is metadata-only and cannot be played here.');
      return;
    }
    if (isCurrent) togglePlay();
    else playQueue(context && context.length ? context : [track], context ? (context.findIndex((t) => t.providerTrackId === track.providerTrackId) >= 0 ? context.findIndex((t) => t.providerTrackId === track.providerTrackId) : 0) : 0);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toastError('Please sign in to like songs.');
      return;
    }
    try {
      if (!track.id) {
        const ing = await api<{ track: Track }>('/api/tracks/ingest', { method: 'POST', body: { track } });
        track.id = ing.track.id;
      }
      if (liked) {
        await api(`/api/me/liked/${track.id}`, { method: 'DELETE' });
        setLiked(false);
        toastSuccess('Removed from Liked Songs');
      } else {
        await api(`/api/me/liked/${track.id}`, { method: 'PUT' });
        setLiked(true);
        toastSuccess('Added to Liked Songs');
      }
      onPlaylistChange?.();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not update your library.');
    }
  };

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl px-2 py-2 transition sm:px-3 ${isCurrent ? 'bg-white/[0.07]' : 'hover:bg-white/[0.05]'}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative flex w-8 shrink-0 items-center justify-center">
        {showIndex && index !== undefined ? (
          <span className={`text-sm font-semibold tabular-nums ${isCurrent ? 'text-accent-400' : 'text-zinc-500'}`}>{index + 1}</span>
        ) : (
          <Artwork src={track.artworkUrl} alt="" className="h-11 w-11" rounded="rounded-lg" />
        )}
        {!showIndex && (
          <button
            onClick={handlePlay}
            className={`absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 transition ${playable && (hover || playing) ? 'opacity-100' : 'opacity-0'}`}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
          </button>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button onClick={handlePlay} className={`truncate text-sm font-semibold ${isCurrent ? 'text-accent-400' : ''} ${playable ? 'hover:underline' : ''}`}>
            {track.title}
          </button>
          {track.stream.isPreview && (
            <span className="hidden shrink-0 rounded-full border border-amber-400/25 bg-amber-400/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-300 sm:inline">
              preview
            </span>
          )}
        </div>
        <div className="truncate text-xs text-zinc-400">
          <Link to={`/artist/${track.provider}/${encodeURIComponent(track.providerTrackId)}`} className="hover:text-zinc-200 hover:underline">
            {track.artistName}
          </Link>
          {showAlbum && track.albumName && (
            <>
              {' · '}
              <Link to={`/album/${track.provider}/${encodeURIComponent(track.providerTrackId)}`} className="hidden hover:text-zinc-200 hover:underline md:inline">
                {track.albumName}
              </Link>
            </>
          )}
        </div>
      </div>

      <ProviderBadge track={track} className="hidden lg:inline-flex" />

      <span className="hidden w-10 text-right text-xs tabular-nums text-zinc-500 sm:block">{formatDuration(track.durationSec)}</span>

      <button onClick={handleLike} className={`btn-icon !p-1.5 ${liked ? 'text-rose2-400' : ''}`} aria-label={liked ? 'Unlike' : 'Like'} title={liked ? 'Unlike' : 'Like'}>
        <Heart className={`h-4 w-4 ${liked ? 'fill-rose2-400' : ''}`} />
      </button>

      <MoreButton
        track={track}
        onAddToPlaylist={() => openPlaylistPicker(track)}
        onShare={() => openShare(track)}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100"
      />
    </div>
  );
});
