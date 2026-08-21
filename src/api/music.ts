import type { Album, Artist, RemotePlaylist, SearchResults, Track } from "../types/music";
import { placeholderArt } from "../utils/format";

const JAMENDO_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID || "b6747d04";
const APP = import.meta.env.VITE_AUDIUS_APP_NAME || "lumen-music";

let audiusHost = "/api/audius";

async function json<T>(url: string, timeout = 12000): Promise<T> {
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
    const hosts = await json<string[]>("https://api.audius.co");
    if (hosts?.[0]) audiusHost = `${hosts[0].replace(/\/$/, "")}/v1`;
  } catch {
    audiusHost = "/api/audius";
  }
}

function art(url?: string | null, seed = "x") {
  return url || placeholderArt(seed);
}

function mapAudiusTrack(t: any): Track {
  const artwork =
    t.artwork?.["480x480"] || t.artwork?.["150x150"] || placeholderArt(t.title);
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

const LOCAL_FALLBACK: Track[] = [
  {
    id: "local:ia-bwv846",
    title: "Prelude in C Major, BWV 846",
    artist: "Johann Sebastian Bach (public domain)",
    album: "Well-Tempered Clavier",
    artwork: placeholderArt("bach"),
    duration: 140,
    streamUrl: "https://archive.org/download/jsbachwelltemperedclavierbook1/01.Prelude_and_Fugue_No.1_in_C_major_BWV_846.mp3",
    source: "archive",
    license: "Public Domain",
  },
  {
    id: "local:ia-moonlight",
    title: "Moonlight Sonata (1st movement)",
    artist: "Ludwig van Beethoven (public domain)",
    album: "Piano Sonata No. 14",
    artwork: placeholderArt("beethoven"),
    duration: 360,
    streamUrl: "https://archive.org/download/MoonlightSonata_750/Beethoven-MoonlightSonata.mp3",
    source: "archive",
    license: "Public Domain",
  },
  {
    id: "local:ia-canon",
    title: "Canon in D",
    artist: "Johann Pachelbel (public domain)",
    album: "Baroque Favorites",
    artwork: placeholderArt("pachelbel"),
    duration: 300,
    streamUrl: "https://archive.org/download/PachelbelCanoninD/Canon_in_D.mp3",
    source: "archive",
    license: "Public Domain",
  },
  {
    id: "local:ia-four-seasons",
    title: "Spring — Allegro",
    artist: "Antonio Vivaldi (public domain)",
    album: "The Four Seasons",
    artwork: placeholderArt("vivaldi"),
    duration: 200,
    streamUrl: "https://archive.org/download/TheFourSeasonsVivaldi/01.SpringAllegro.mp3",
    source: "archive",
    license: "Public Domain",
  },
  {
    id: "local:jamendo-demo",
    title: "Independent Mix (Jamendo catalog)",
    artist: "Jamendo Artists",
    album: "Open Catalog",
    artwork: placeholderArt("jamendo"),
    duration: 180,
    streamUrl: `https://api.jamendo.com/v3.0/tracks/file/?client_id=${JAMENDO_ID}&id=1321392&action=stream`,
    source: "jamendo",
    license: "Creative Commons",
  },
];

export async function fetchTrending(): Promise<Track[]> {
  const errors: string[] = [];
  try {
    const data = await json<{ data: any[] }>(
      `${audiusHost}/tracks/trending?app_name=${APP}&limit=20`
    );
    if (data.data?.length) return data.data.map(mapAudiusTrack);
  } catch (e) {
    errors.push(String(e));
  }
  try {
    const data = await json<{ results: any[] }>(
      `/api/jamendo/tracks/?client_id=${JAMENDO_ID}&format=jsonpretty&limit=20&include=musicinfo&audioformat=mp32&order=popularity_total`
    );
    if (data.results?.length) return data.results.map(mapJamendoTrack);
  } catch (e) {
    errors.push(String(e));
  }
  try {
    const data = await json<any>(
      `/api/archive/advancedsearch.php?q=collection%3Aopensource_audio+AND+mediatype%3Aaudio&fl[]=identifier&fl[]=title&fl[]=creator&rows=12&page=1&output=json`
    );
    const docs = data.response?.docs ?? [];
    if (docs.length) {
      return docs.map((d: any) => ({
        id: `archive:${d.identifier}`,
        title: d.title || d.identifier,
        artist: d.creator || "Internet Archive",
        artwork: `https://archive.org/services/img/${d.identifier}`,
        duration: 0,
        streamUrl: `https://archive.org/download/${d.identifier}/${d.identifier}.mp3`,
        source: "archive" as const,
        license: "See item page",
      }));
    }
  } catch (e) {
    errors.push(String(e));
  }
  console.warn("Using local public-domain fallback catalog", errors);
  return LOCAL_FALLBACK;
}

export async function fetchFeaturedPlaylists(): Promise<RemotePlaylist[]> {
  try {
    const data = await json<{ data: any[] }>(
      `${audiusHost}/playlists/trending?app_name=${APP}&limit=12`
    );
    return (data.data || []).map((p) => ({
      id: `audius-pl:${p.id}`,
      title: p.playlist_name,
      artwork: art(p.artwork?.["480x480"], p.playlist_name),
      description: p.description,
      source: "audius" as const,
    }));
  } catch {
    return [
      { id: "local-pl:classics", title: "Public Domain Classics", artwork: placeholderArt("classics"), source: "local" },
      { id: "local-pl:indie", title: "Independent Voices", artwork: placeholderArt("indie"), source: "jamendo" },
      { id: "local-pl:archive", title: "Archive Live", artwork: placeholderArt("live"), source: "archive" },
    ];
  }
}

export async function searchAll(q: string): Promise<SearchResults> {
  const query = q.trim();
  if (!query) return { tracks: [], artists: [], albums: [], playlists: [] };

  const empty: SearchResults = { tracks: [], artists: [], albums: [], playlists: [] };

  const [audius, jamendo] = await Promise.allSettled([
    json<{ data: any[] }>(`${audiusHost}/tracks/search?query=${encodeURIComponent(query)}&app_name=${APP}&limit=20`),
    json<{ results: any[] }>(
      `/api/jamendo/tracks/?client_id=${JAMENDO_ID}&format=json&limit=20&namesearch=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`
    ),
  ]);

  if (audius.status === "fulfilled" && audius.value.data?.length) {
    const tracks = audius.value.data.map(mapAudiusTrack);
    const artists = uniqueArtists(tracks);
    const albums = uniqueAlbums(tracks);
    return { tracks, artists, albums, playlists: [] };
  }
  if (jamendo.status === "fulfilled" && jamendo.value.results?.length) {
    const tracks = jamendo.value.results.map(mapJamendoTrack);
    return { tracks, artists: uniqueArtists(tracks), albums: uniqueAlbums(tracks), playlists: [] };
  }

  const local = LOCAL_FALLBACK.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.artist.toLowerCase().includes(query.toLowerCase())
  );
  return { ...empty, tracks: local, artists: uniqueArtists(local), albums: uniqueAlbums(local) };
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

export { LOCAL_FALLBACK };
