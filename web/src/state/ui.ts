import { create } from 'zustand';
import type { Track } from '../lib/types';

interface UiState {
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  playlistPicker: { open: boolean; track: Track | null };
  openPlaylistPicker: (track: Track) => void;
  closePlaylistPicker: () => void;
  shareTrack: Track | null;
  openShare: (track: Track) => void;
  closeShare: () => void;
}

function storedTheme(): 'dark' | 'light' {
  return (localStorage.getItem('sangeet_theme') as 'dark' | 'light') ?? 'dark';
}

export const useUiStore = create<UiState>((set) => ({
  theme: storedTheme(),
  setTheme: (t) => {
    localStorage.setItem('sangeet_theme', t);
    document.documentElement.classList.toggle('light', t === 'light');
    document.documentElement.classList.toggle('dark', t !== 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f4f5f7' : '#0a0b0f');
    set({ theme: t });
  },
  playlistPicker: { open: false, track: null },
  openPlaylistPicker: (track) => set({ playlistPicker: { open: true, track } }),
  closePlaylistPicker: () => set({ playlistPicker: { open: false, track: null } }),
  shareTrack: null,
  openShare: (track) => set({ shareTrack: track }),
  closeShare: () => set({ shareTrack: null }),
}));
