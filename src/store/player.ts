import { create } from "zustand";
import type { RepeatMode, Track } from "../types/music";
import { useLibrary } from "./library";

interface PlayerState {
  queue: Track[];
  index: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  expanded: boolean;
  queueOpen: boolean;
  error: string | null;
  current: () => Track | null;
  playTrack: (track: Track, queue?: Track[]) => void;
  playQueue: (tracks: Track[], start?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  setTime: (t: number, d: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (t: Track) => void;
  playNext: (t: Track) => void;
  removeFromQueue: (i: number) => void;
  moveQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  setExpanded: (v: boolean) => void;
  setQueueOpen: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const audioEl = typeof Audio !== "undefined" ? new Audio() : (null as unknown as HTMLAudioElement);

if (audioEl) {
  audioEl.preload = "auto";
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  index: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.85,
  muted: false,
  shuffle: false,
  repeat: "off",
  expanded: false,
  queueOpen: false,
  error: null,
  current: () => get().queue[get().index] ?? null,
  playTrack: (track, queue) => {
    const q = queue?.length ? queue : [track];
    const i = Math.max(0, q.findIndex((t) => t.id === track.id));
    set({ queue: q, index: i, isPlaying: true, error: null });
    load(q[i]);
  },
  playQueue: (tracks, start = 0) => {
    if (!tracks.length) return;
    set({ queue: tracks, index: start, isPlaying: true, error: null });
    load(tracks[start]);
  },
  toggle: () => {
    const { isPlaying } = get();
    if (!audioEl.src) return;
    if (isPlaying) audioEl.pause();
    else audioEl.play().catch(() => set({ error: "Playback was blocked. Try pressing play again." }));
    set({ isPlaying: !isPlaying });
  },
  next: () => {
    const { queue, index, shuffle, repeat } = get();
    if (!queue.length) return;
    let next = index + 1;
    if (shuffle) next = Math.floor(Math.random() * queue.length);
    else if (next >= queue.length) next = repeat === "all" ? 0 : index;
    if (next === index && repeat !== "all" && !shuffle) {
      audioEl.pause();
      set({ isPlaying: false });
      return;
    }
    set({ index: next, isPlaying: true });
    load(queue[next]);
  },
  prev: () => {
    const { queue, index } = get();
    if (audioEl.currentTime > 3) {
      audioEl.currentTime = 0;
      return;
    }
    const prev = (index - 1 + queue.length) % queue.length;
    set({ index: prev, isPlaying: true });
    load(queue[prev]);
  },
  seek: (t) => {
    audioEl.currentTime = t;
    set({ currentTime: t });
  },
  setTime: (t, d) => set({ currentTime: t, duration: d }),
  setVolume: (v) => {
    audioEl.volume = v;
    set({ volume: v, muted: v === 0 });
  },
  toggleMute: () => {
    const muted = !get().muted;
    audioEl.muted = muted;
    set({ muted });
  },
  toggleShuffle: () => set({ shuffle: !get().shuffle }),
  cycleRepeat: () => {
    const order: RepeatMode[] = ["off", "all", "one"];
    const i = order.indexOf(get().repeat);
    set({ repeat: order[(i + 1) % order.length] });
  },
  addToQueue: (t) => set({ queue: [...get().queue, t] }),
  playNext: (t) => {
    const { queue, index } = get();
    const q = [...queue];
    q.splice(index + 1, 0, t);
    set({ queue: q });
  },
  removeFromQueue: (i) => {
    const q = get().queue.filter((_, idx) => idx !== i);
    set({ queue: q, index: Math.min(get().index, Math.max(0, q.length - 1)) });
  },
  moveQueue: (from, to) => {
    const q = [...get().queue];
    const [m] = q.splice(from, 1);
    q.splice(to, 0, m);
    let index = get().index;
    if (from === index) index = to;
    else if (from < index && to >= index) index -= 1;
    else if (from > index && to <= index) index += 1;
    set({ queue: q, index });
  },
  clearQueue: () => {
    audioEl.pause();
    set({ queue: [], index: 0, isPlaying: false });
  },
  setExpanded: (v) => set({ expanded: v }),
  setQueueOpen: (v) => set({ queueOpen: v }),
  setError: (e) => set({ error: e }),
}));

function load(track: Track) {
  if (!track?.streamUrl) {
    usePlayer.getState().setError("This track has no playable audio.");
    return;
  }
  audioEl.src = track.streamUrl;
  audioEl.load();
  audioEl.volume = usePlayer.getState().volume;
  audioEl.play().catch(() => {
    usePlayer.getState().setError("Could not start playback. The source may be unavailable.");
    usePlayer.setState({ isPlaying: false });
  });
  useLibrary.getState().addRecent(track);
}

if (audioEl) {
  audioEl.addEventListener("timeupdate", () => {
    usePlayer.getState().setTime(audioEl.currentTime, audioEl.duration || 0);
  });
  audioEl.addEventListener("ended", () => {
    const { repeat, next } = usePlayer.getState();
    if (repeat === "one") {
      audioEl.currentTime = 0;
      audioEl.play();
    } else next();
  });
  audioEl.addEventListener("error", () => {
    usePlayer.getState().setError("This station stream failed. Try another station — live radio URLs vary by region.");
  });
}
