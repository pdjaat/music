import type { Album, Artist, RemotePlaylist, SearchResults, Track } from "../types/music";
import { placeholderArt } from "../utils/format";
import { CATALOG, FEATURED_PLAYLISTS, searchCatalog } from "./catalog";

const JAMENDO_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID || "b6747d04";
const APP = import.meta.env.VITE_AUDIUS_APP_NAME || "lumen-music";

let audiusHost = "/api/audius";

async function json<T>(url: string, timeout = 2500): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function resolveAudiusHost() {
  try {
    const hosts = await json<string[]>("https://api.audius.co", 2000);
    if (hosts?.[0]) audiusHost = `${hosts[0].replace(/\/$/, "")}/v1`;
  } catch {
    audiusHost = "/api/audius";
  }
}

function art(url?: string | null, seed = "x") {
  return url || placeholderArt(seed);
}

function mapAudiusTrack(t: any): Track {
  const artwork = t.artwork?.["480x480"] || t.artwork?.["150x150"] || placeholderArt(t.title);
  return {
    id: `audius:${t.id}`,
    title: t.title,
    artist: t.user?.name || "Unknown",
    artistId: t.user?.id,
    album: t.album || t.title,
    artwork,
    duration: Number(t.duration) || 0,
    streamUrl: `${audiusHost}/tracks/${t.id}/stream?app_name=${APP}`,
    source: "audius",
    permalink: t.permalink,
  };
}

function mapJamendoTrack(t: any): Track {
  return {
    id: `jamendo:${t.id}`,
    title: t.name,
    artist: t.artist_name,
    artistId: t.artist_id,
    album: t.album_name,
    albumId: t.album_id,
    artwork: art(t.album_image || t.image, t.name),
    duration: Number(t.duration) || 0,
    streamUrl: t.audio,
    source: "jamendo",
    license: t.license_ccurl,
  };
}

export async function fetchTrending(): Promise<Track[]> {
  try {
    const data = await json<{ data: any[] }>(`${audiusHost}/tracks/trending?app_name=${APP}&limit=20`);
    if (data.data?.length) return [...CATALOG, ...data.data.map(mapAudiusTrack)];
  } catch {
    /* local catalog is enough */
  }
  try {
    const data = await json<{ results: any[] }>(
      `/api/jamendo/tracks/?client_id=${JAMENDO_ID}&format=json&limit=12&include=musicinfo&audioformat=mp32&order=popularity_total`
    );
    if (data.results?.length) return [...CATALOG, ...data.results.map(mapJamendoTrack)];
  } catch {
    /* ignore */
  }
  return CATALOG;
}

export async function fetchFeaturedPlaylists(): Promise<RemotePlaylist[]> {
  try {
    const data = await json<{ data: any[] }>(`${audiusHost}/playlists/trending?app_name=${APP}&limit=8`);
    if (data.data?.length) {
      return [
        ...FEATURED_PLAYLISTS,
        ...data.data.map((p) => ({
          id: `audius-pl:${p.id}`,
          title: p.playlist_name,
          artwork: art(p.artwork?.["480x480"], p.playlist_name),
          description: p.description,
          source: "audius" as const,
        })),
      ];
    }
  } catch {
    /* ignore */
  }
  return FEATURED_PLAYLISTS;
}

export async function searchAll(q: string): Promise<SearchResults> {
  const query = q.trim();
  const local = searchCatalog(query);
  if (!query) return { tracks: [], artists: [], albums: [], playlists: [] };

  let remote: Track[] = [];
  try {
    const audius = await json<{ data: any[] }>(
      `${audiusHost}/tracks/search?query=${encodeURIComponent(query)}&app_name=${APP}&limit=12`
    );
    if (audius.data?.length) remote = audius.data.map(mapAudiusTrack);
  } catch {
    try {
      const jamendo = await json<{ results: any[] }>(
        `/api/jamendo/tracks/?client_id=${JAMENDO_ID}&format=json&limit=12&namesearch=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`
      );
      if (jamendo.results?.length) remote = jamendo.results.map(mapJamendoTrack);
    } catch {
      /* local only */
    }
  }

  const tracks = [...local, ...remote];
  return { tracks, artists: uniqueArtists(tracks), albums: uniqueAlbums(tracks), playlists: [] };
}

function uniqueArtists(tracks: Track[]): Artist[] {
  const map = new Map<string, Artist>();
  for (const t of tracks) {
    const id = t.artistId || t.artist;
    if (!map.has(id)) map.set(id, { id, name: t.artist, artwork: t.artwork, source: t.source });
  }
  return [...map.values()];
}

function uniqueAlbums(tracks: Track[]): Album[] {
  const map = new Map<string, Album>();
  for (const t of tracks) {
    const id = t.albumId || t.album || t.id;
    if (!map.has(id))
      map.set(id, { id, title: t.album || t.title, artist: t.artist, artwork: t.artwork, source: t.source });
  }
  return [...map.values()];
}

export { CATALOG as LOCAL_FALLBACK };
