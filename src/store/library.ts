import { create } from "zustand";
import { loadJSON, saveJSON } from "../utils/storage";
import type { Track, UserPlaylist } from "../types/music";

interface LibraryState {
  userId: string | null;
  favorites: Track[];
  playlists: UserPlaylist[];
  recentlyPlayed: Track[];
  hydrate: (userId: string) => void;
  toggleFavorite: (track: Track) => void;
  isFavorite: (id: string) => boolean;
  addRecent: (track: Track) => void;
  createPlaylist: (name: string) => UserPlaylist;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (id: string, track: Track) => void;
  removeFromPlaylist: (id: string, trackId: string) => void;
  reorderPlaylist: (id: string, from: number, to: number) => void;
}

function key(userId: string, k: string) {
  return `u.${userId}.${k}`;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  userId: null,
  favorites: [],
  playlists: [],
  recentlyPlayed: [],
  hydrate: (userId) => {
    set({
      userId,
      favorites: loadJSON(key(userId, "fav"), []),
      playlists: loadJSON(key(userId, "pl"), []),
      recentlyPlayed: loadJSON(key(userId, "recent"), []),
    });
  },
  toggleFavorite: (track) => {
    const { userId, favorites } = get();
    if (!userId) return;
    const exists = favorites.some((t) => t.id === track.id);
    const next = exists ? favorites.filter((t) => t.id !== track.id) : [track, ...favorites];
    saveJSON(key(userId, "fav"), next);
    set({ favorites: next });
  },
  isFavorite: (id) => get().favorites.some((t) => t.id === id),
  addRecent: (track) => {
    const { userId, recentlyPlayed } = get();
    if (!userId) return;
    const next = [track, ...recentlyPlayed.filter((t) => t.id !== track.id)].slice(0, 40);
    saveJSON(key(userId, "recent"), next);
    set({ recentlyPlayed: next });
  },
  createPlaylist: (name) => {
    const { userId, playlists } = get();
    const pl: UserPlaylist = {
      id: crypto.randomUUID(),
      name,
      description: "",
      trackIds: [],
      tracks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (!userId) return pl;
    const next = [pl, ...playlists];
    saveJSON(key(userId, "pl"), next);
    set({ playlists: next });
    return pl;
  },
  renamePlaylist: (id, name) => {
    const { userId, playlists } = get();
    if (!userId) return;
    const next = playlists.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p));
    saveJSON(key(userId, "pl"), next);
    set({ playlists: next });
  },
  deletePlaylist: (id) => {
    const { userId, playlists } = get();
    if (!userId) return;
    const next = playlists.filter((p) => p.id !== id);
    saveJSON(key(userId, "pl"), next);
    set({ playlists: next });
  },
  addToPlaylist: (id, track) => {
    const { userId, playlists } = get();
    if (!userId) return;
    const next = playlists.map((p) =>
      p.id === id && !p.tracks.some((t) => t.id === track.id)
        ? { ...p, tracks: [...p.tracks, track], trackIds: [...p.trackIds, track.id], updatedAt: Date.now() }
        : p
    );
    saveJSON(key(userId, "pl"), next);
    set({ playlists: next });
  },
  removeFromPlaylist: (id, trackId) => {
    const { userId, playlists } = get();
    if (!userId) return;
    const next = playlists.map((p) =>
      p.id === id
        ? {
            ...p,
            tracks: p.tracks.filter((t) => t.id !== trackId),
            trackIds: p.trackIds.filter((x) => x !== trackId),
            updatedAt: Date.now(),
          }
        : p
    );
    saveJSON(key(userId, "pl"), next);
    set({ playlists: next });
  },
  reorderPlaylist: (id, from, to) => {
    const { userId, playlists } = get();
    if (!userId) return;
    const next = playlists.map((p) => {
      if (p.id !== id) return p;
      const tracks = [...p.tracks];
      const [moved] = tracks.splice(from, 1);
      tracks.splice(to, 0, moved);
      return { ...p, tracks, trackIds: tracks.map((t) => t.id), updatedAt: Date.now() };
    });
    saveJSON(key(userId, "pl"), next);
    set({ playlists: next });
  },
}));
