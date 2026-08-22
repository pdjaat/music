import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './pages/Home';
import { SearchPage } from './pages/Search';
import { RadioPage } from './pages/Radio';
import { ProvidersPage } from './pages/ProvidersPage';
import { LoginPage } from './pages/LoginPage';
import { LibraryPage } from './pages/Library';
import { TrackRow } from './components/TrackRow';
import type { Track } from './lib/types';

function mockFetch(payload: unknown, status = 200) {
  return vi.fn(async (url: string) => {
    if (url.includes('/api/health/providers')) {
      // Pretend a provider is reachable so the client stays in server mode
      // and never hits browser JSONP providers in jsdom.
      return new Response(JSON.stringify({ providers: [{ provider: 'internetarchive', reachable: true, configured: true }] }), { status, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/api/home')) {
      return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('/api/radio')) {
      return new Response(JSON.stringify({ stations: [] }), { status, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({}), { status, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
}

const emptyHome = {
  providersUnavailable: false,
  languages: [], genres: [], stations: [], featured: [],
  recentlyPlayed: [], continueListening: [], recommended: { tracks: [], reasons: [] }, mixes: [],
  newReleases: [], trending: [], providerInfo: null,
};

const sampleTrack: Track = {
  id: 1,
  title: 'Kesariya',
  artistName: 'Arijit Singh',
  provider: 'deezer',
  providerTrackId: 'dz:1',
  stream: { kind: 'url', url: 'https://example.com/a.mp3', isPreview: true, providerTrackId: 'dz:1' },
  playable: true,
};

describe('pages render without crashing', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', mockFetch(emptyHome));
    vi.stubGlobal('scrollTo', vi.fn());
    // YT API must not actually load in jsdom
    vi.stubGlobal('window', window);
  });

  it('renders the home page hero', async () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('every language');
  });

  it('renders the search page', async () => {
    render(<MemoryRouter><SearchPage /></MemoryRouter>);
    expect(screen.getByPlaceholderText(/Try “Arijit Singh”/i)).toBeTruthy();
  });

  it('renders the radio page', async () => {
    render(<MemoryRouter><RadioPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('renders the providers page', async () => {
    render(<MemoryRouter><ProvidersPage /></MemoryRouter>);
    expect(await screen.findAllByText(/Providers & legality/i)).toBeTruthy();
  });

  it('renders the login page', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByText(/Welcome back/i)).toBeTruthy();
  });

  it('renders library as guest with sign-in prompt', () => {
    render(<MemoryRouter><LibraryPage /></MemoryRouter>);
    expect(screen.getByText(/listening as a guest/i)).toBeTruthy();
  });

  it('renders a track row with preview badge', () => {
    render(<MemoryRouter><TrackRow track={sampleTrack} context={[sampleTrack]} /></MemoryRouter>);
    expect(screen.getByText('Kesariya')).toBeTruthy();
    expect(screen.getAllByText('preview').length).toBeGreaterThan(0);
  });
});
