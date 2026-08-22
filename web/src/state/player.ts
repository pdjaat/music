import { create } from 'zustand';
import type { Track } from '../lib/types';

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  queue: Track[];
  queueIndex: number;
  current: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  buffering: boolean;
  error: string | null;
  fullPlayerOpen: boolean;

  playQueue: (tracks: Track[], startIndex?: number) => void;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setPosition: (t: number) => void;
  setDuration: (d: number) => void;
  setBuffering: (b: boolean) => void;
  setError: (e: string | null) => void;
  setFullPlayerOpen: (open: boolean) => void;
  clearPlayer: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  queueIndex: -1,
  current: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: 'off',
  buffering: false,
  error: null,
  fullPlayerOpen: false,

  playQueue: (tracks, startIndex = 0) => {
    const list = tracks.filter((t) => t && t.stream && (t.stream.kind === 'url' || t.stream.kind === 'youtube'));
    if (list.length === 0) {
      set({ error: 'No playable tracks in this selection (previews may be unavailable).' });
      return;
    }
    const idx = Math.max(0, Math.min(startIndex, list.length - 1));
    // Starting playback is the intent — the engine picks it up and plays.
    set({ queue: list, queueIndex: idx, current: list[idx], isPlaying: true, error: null });
    window.dispatchEvent(new CustomEvent('sangeet:queue-changed'));
  },

  playTrack: (track) => {
    if (!track || !track.stream || (track.stream.kind !== 'url' && track.stream.kind !== 'youtube')) {
      set({ error: 'This track has no playable stream (metadata-only). Try another song.' });
      return;
    }
    set({ queue: [track], queueIndex: 0, current: track, isPlaying: true, error: null });
    window.dispatchEvent(new CustomEvent('sangeet:queue-changed'));
  },

  togglePlay: () => set((s) => {
    const nextPlaying = !s.isPlaying;
    window.dispatchEvent(new CustomEvent('sangeet:play-toggle', { detail: { playing: nextPlaying } }));
    return { isPlaying: nextPlaying };
  }),

  pause: () => {
    window.dispatchEvent(new CustomEvent('sangeet:play-toggle', { detail: { playing: false } }));
    set({ isPlaying: false });
  },

  resume: () => {
    window.dispatchEvent(new CustomEvent('sangeet:play-toggle', { detail: { playing: true } }));
    set({ isPlaying: true });
  },

  next: (auto = false) => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (queue.length === 0) return;
    let nextIndex: number;
    if (repeat === 'one' && auto) {
      nextIndex = queueIndex;
    } else if (shuffle && queue.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (nextIndex === queueIndex);
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeat === 'all') nextIndex = 0;
        else {
          // End of queue: stop, keep the last track displayed. No queue-changed
          // event — replaying the same (possibly broken) track would loop.
          set({ isPlaying: false, position: 0, buffering: false });
          return;
        }
      }
    }
    set({ queueIndex: nextIndex, current: queue[nextIndex], position: 0, duration: 0, error: null });
    window.dispatchEvent(new CustomEvent('sangeet:queue-changed'));
  },

  prev: () => {
    const { queue, queueIndex, position } = get();
    if (queue.length === 0) return;
    if (position > 3) {
      window.dispatchEvent(new CustomEvent('sangeet:seek', { detail: { t: 0 } }));
      set({ position: 0 });
      return;
    }
    const prevIndex = queueIndex > 0 ? queueIndex - 1 : 0;
    set({ queueIndex: prevIndex, current: queue[prevIndex], position: 0, duration: 0, error: null });
    window.dispatchEvent(new CustomEvent('sangeet:queue-changed'));
  },

  seek: (t) => {
    window.dispatchEvent(new CustomEvent('sangeet:seek', { detail: { t } }));
    set({ position: t });
  },

  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    window.dispatchEvent(new CustomEvent('sangeet:volume', { detail: { volume: clamped, muted: false } }));
    set({ volume: clamped, muted: false });
  },

  toggleMute: () => {
    const muted = !get().muted;
    window.dispatchEvent(new CustomEvent('sangeet:volume', { detail: { volume: get().volume, muted } }));
    set({ muted });
  },

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () => set((s) => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),
  setPosition: (t) => set({ position: t }),
  setDuration: (d) => set({ duration: d }),
  setBuffering: (b) => set({ buffering: b }),
  setError: (e) => set({ error: e }),
  setFullPlayerOpen: (open) => set({ fullPlayerOpen: open }),
  clearPlayer: () => set({ queue: [], queueIndex: -1, current: null, isPlaying: false, position: 0, duration: 0, error: null }),
}));
