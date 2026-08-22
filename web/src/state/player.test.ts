import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayerStore } from './player';
import type { Track } from '../lib/types';

const makeTrack = (i: number): Track => ({
  title: `Song ${i}`,
  artistName: 'A',
  provider: 'deezer',
  providerTrackId: `dz:${i}`,
  stream: { kind: 'url', url: `https://x/${i}.mp3`, isPreview: true, providerTrackId: `dz:${i}` },
});

describe('player store', () => {
  beforeEach(() => {
    usePlayerStore.getState().clearPlayer();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('playQueue sets isPlaying + current and dispatches', () => {
    const dispatched = vi.fn();
    window.addEventListener('sangeet:queue-changed', dispatched);
    usePlayerStore.getState().playQueue([makeTrack(1), makeTrack(2)], 0);
    const s = usePlayerStore.getState();
    expect(s.current?.title).toBe('Song 1');
    expect(s.isPlaying).toBe(true);
    expect(dispatched).toHaveBeenCalledTimes(1);
    window.removeEventListener('sangeet:queue-changed', dispatched);
  });

  it('next() at end of queue stops WITHOUT dispatching (prevents error loop)', () => {
    const dispatched = vi.fn();
    window.addEventListener('sangeet:queue-changed', dispatched);
    usePlayerStore.getState().playQueue([makeTrack(1)], 0);
    dispatched.mockClear();
    usePlayerStore.getState().next(true);
    const s = usePlayerStore.getState();
    expect(s.isPlaying).toBe(false);
    expect(dispatched).not.toHaveBeenCalled();
    window.removeEventListener('sangeet:queue-changed', dispatched);
  });

  it('next() advances through the queue and dispatches', () => {
    const dispatched = vi.fn();
    window.addEventListener('sangeet:queue-changed', dispatched);
    usePlayerStore.getState().playQueue([makeTrack(1), makeTrack(2)], 0);
    dispatched.mockClear();
    usePlayerStore.getState().next(true);
    expect(usePlayerStore.getState().current?.title).toBe('Song 2');
    expect(dispatched).toHaveBeenCalledTimes(1);
    window.removeEventListener('sangeet:queue-changed', dispatched);
  });

  it('repeat-all wraps around at the end', () => {
    usePlayerStore.getState().playQueue([makeTrack(1), makeTrack(2)], 1); // start on last
    usePlayerStore.getState().cycleRepeat(); // off -> all
    usePlayerStore.getState().next(true);
    expect(usePlayerStore.getState().queueIndex).toBe(0);
  });

  it('rejects unplayable (metadata-only) tracks with a clear error', () => {
    usePlayerStore.getState().playTrack({
      ...makeTrack(1),
      stream: { kind: 'unavailable', isPreview: false, providerTrackId: 'x' },
    });
    const s = usePlayerStore.getState();
    expect(s.current).toBeNull();
    expect(s.error).toContain('no playable stream');
  });
});
