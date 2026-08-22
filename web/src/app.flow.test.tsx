import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { App } from './App';
import { usePlayerStore } from './state/player';
import type { Track } from './lib/types';

const railsTrack: Track = {
  title: 'Rail Song',
  artistName: 'Rail Artist',
  provider: 'deezer',
  providerTrackId: 'dz:rail1',
  stream: { kind: 'url', url: 'https://preview.example/rail.mp3', isPreview: true, providerTrackId: 'dz:rail1' },
  playable: true,
};

// Replace the browser providers so rails resolve instantly (no real JSONP).
vi.mock('./providers/browserProviders', () => {
  const provider = {
    id: 'deezer',
    displayName: 'Deezer (mock)',
    kind: 'stream',
    trending: vi.fn(async () => [railsTrack]),
    newReleases: vi.fn(async () => [railsTrack]),
    search: vi.fn(async () => ({ query: '', tracks: [railsTrack], albums: [], artists: [], playlists: [] })),
    getRadioTracks: vi.fn(async () => [railsTrack]),
    trackRadio: vi.fn(async () => [railsTrack]),
  };
  const empty = {
    ...provider,
    trending: vi.fn(async () => []),
    newReleases: vi.fn(async () => []),
    search: vi.fn(async () => ({ query: '', tracks: [], albums: [], artists: [], playlists: [] })),
  };
  return {
    browserProviders: { deezer: provider, itunes: empty, internetarchive: empty, musicbrainz: empty },
    primaryBrowserProvider: () => provider,
    fallbackBrowserProvider: () => empty,
    fullStreamBrowserProvider: () => empty,
  };
});

const homePayload = {
  providersUnavailable: true,
  languages: [{ id: 1, code: 'hi', name: 'Hindi', name_native: 'हिन्दी' }, { id: 2, code: 'pa', name: 'Punjabi', name_native: 'ਪੰਜਾਬੀ' }],
  genres: [{ id: 1, slug: 'bollywood', name: 'Bollywood', name_native: 'बॉलीवुड' }],
  stations: [{ id: 1, slug: 'hindi-radio', name: 'Hindi Radio', description: 'x', provider: 'auto', seed: { query: 'hindi' } }],
  featured: [{ id: 1, title: 'Hindi Hits', subtitle: 'x', cover_url: null, provider: 'auto', seed: {}, sort: 1 }],
  recentlyPlayed: [],
  continueListening: [],
  recommended: { tracks: [], reasons: [] },
  mixes: [],
  newReleases: [],
  trending: [],
  providerInfo: null,
};

function mockApiFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes('/api/health/providers')) {
      return new Response(JSON.stringify({ providers: [{ provider: 'internetarchive', reachable: false }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/api/home')) {
      return new Response(JSON.stringify(homePayload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/api/featured')) {
      return new Response(JSON.stringify({ featured: homePayload.featured }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/api/radio')) {
      return new Response(JSON.stringify({ stations: homePayload.stations }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/api/tracks/ingest')) {
      return new Response(JSON.stringify({ track: { ...railsTrack, id: 1 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
}

describe('full app flow (browser-provider mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', mockApiFetch());
    vi.stubGlobal('scrollTo', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    usePlayerStore.getState().clearPlayer();
  });

  it('renders server content immediately, fills rails, and wires playback', async () => {
    render(<App />);

    // 1) Server content appears fast (no waiting on JSONP providers).
    expect(await screen.findByText('Hindi')).toBeTruthy();
    expect(screen.getByText('Hindi Hits')).toBeTruthy();
    expect(screen.getByText('Hindi Radio')).toBeTruthy();

    // 2) Rails fill asynchronously from the (mocked) browser providers.
    await waitFor(() => expect(screen.getAllByText('Rail Song').length).toBeGreaterThan(0), { timeout: 5000 });

    // 3) Clicking a track wires it into the player + audio element.
    const playButton = screen.getAllByLabelText(/Play Rail Song/i)[0];
    fireEvent.click(playButton);
    await waitFor(() => expect(usePlayerStore.getState().current?.title).toBe('Rail Song'));

    const audio = document.querySelector('audio');
    expect(audio?.src).toContain('rail.mp3');

    // 4) No infinite loop: jsdom's play() no-ops/throws and the engine
    //    handles either outcome without re-dispatching — the queue stays
    //    wired, the player bar renders, and the page keeps working.
    const s = usePlayerStore.getState();
    expect(s.current?.title).toBe('Rail Song');
    expect(s.queue.length).toBe(1);
    expect(screen.getAllByText(/Rail Song/i).length).toBeGreaterThan(0);
  });
});
