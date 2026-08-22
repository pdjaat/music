import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBrowserRails, searchAll } from './catalog';
import type { Track } from './types';

const track: Track = {
  title: 'T',
  artistName: 'A',
  provider: 'deezer',
  providerTrackId: 'dz:1',
  stream: { kind: 'url', url: 'u', isPreview: true, providerTrackId: 'dz:1' },
};

vi.mock('../providers/browserProviders', () => {
  const good = {
    id: 'deezer',
    displayName: 'x',
    kind: 'stream',
    trending: vi.fn(async () => [track]),
    newReleases: vi.fn(async () => [track]),
    search: vi.fn(async () => ({ query: '', tracks: [track], albums: [], artists: [], playlists: [] })),
    getRadioTracks: vi.fn(async () => []),
    trackRadio: vi.fn(async () => []),
  };
  const bad = {
    ...good,
    trending: vi.fn(async () => { throw new Error('down'); }),
    newReleases: vi.fn(async () => { throw new Error('down'); }),
    search: vi.fn(async () => { throw new Error('down'); }),
  };
  return {
    browserProviders: { deezer: good, itunes: bad, internetarchive: bad, musicbrainz: bad },
    primaryBrowserProvider: () => good,
    fallbackBrowserProvider: () => bad,
    fullStreamBrowserProvider: () => bad,
  };
});

describe('catalog browser rails & search', () => {
  beforeEach(() => {
    // Health check reports ALL server providers unreachable → browser mode.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ providers: [{ provider: 'internetarchive', reachable: false }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('getBrowserRails returns tracks from the first working provider', async () => {
    const rails = await getBrowserRails();
    expect(rails.trending.length).toBeGreaterThan(0);
    expect(rails.newReleases.length).toBeGreaterThan(0);
  });

  it('searchAll falls back through the browser chain', async () => {
    const results = await searchAll('test');
    expect(results.tracks.length).toBeGreaterThan(0);
  });
});
