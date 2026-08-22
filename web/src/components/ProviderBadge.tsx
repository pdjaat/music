import type { Track } from '../lib/types';

const LABELS: Record<string, string> = {
  youtube: 'YouTube',
  deezer: 'Deezer',
  itunes: 'iTunes',
  internetarchive: 'Archive.org',
  musicbrainz: 'MusicBrainz',
};

const COLORS: Record<string, string> = {
  youtube: 'bg-rose-500/15 text-rose-300 border-rose-500/20',
  deezer: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
  itunes: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  internetarchive: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  musicbrainz: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
};

export function ProviderBadge({ track, className = '', compact = false }: { track: Track; className?: string; compact?: boolean }) {
  const label = LABELS[track.provider] ?? track.provider;
  const color = COLORS[track.provider] ?? 'bg-white/10 text-zinc-300 border-white/10';
  const preview = track.stream.isPreview;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${color} ${compact ? '' : className}`}>
      {label}
      {preview && <span className="rounded-full bg-white/15 px-1 text-[9px] uppercase tracking-wide">preview</span>}
    </span>
  );
}

export function PreviewTag({ track, className = '' }: { track: Track; className?: string }) {
  if (!track.stream.isPreview) return null;
  return (
    <span className={`rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ${className}`}>
      30s preview
    </span>
  );
}
