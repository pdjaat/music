import type { Track } from "../types/music";
import { placeholderArt } from "../utils/format";

const HOSTS = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
];

function stationTrack(s: {
  stationuuid?: string;
  name?: string;
  url_resolved?: string;
  url?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  language?: string;
}): Track | null {
  const stream = (s.url_resolved || s.url || "").trim();
  if (!stream) return null;
  const https = stream.replace(/^http:\/\//, "https://");
  const title = (s.name || "Radio").trim();
  return {
    id: `radio:${s.stationuuid || https}`,
    title,
    artist: [s.language, s.country].filter(Boolean).join(" · ") || "Live radio",
    album: s.tags || "Live radio",
    artwork: s.favicon && s.favicon.startsWith("https") ? s.favicon : placeholderArt(title),
    duration: 0,
    streamUrl: https,
    source: "radio",
    live: true,
    license: "Live radio stream published by the station",
    permalink: https,
  };
}

async function radioGet(path: string): Promise<any[]> {
  let last = new Error("radio");
  for (const host of HOSTS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${host}${path}`, {
        signal: ctrl.signal,
        headers: { accept: "application/json" },
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (Array.isArray(data)) return data;
    } catch (e) {
      last = e as Error;
    }
  }
  throw last;
}

export async function searchRadioStations(q: string): Promise<Track[]> {
  const query = q.trim();
  if (!query) return [];
  const params = new URLSearchParams({
    name: query,
    limit: "30",
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
  });
  const tagParams = new URLSearchParams({
    tag: query,
    limit: "20",
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
  });
  const [byName, byTag] = await Promise.allSettled([
    radioGet(`/json/stations/search?${params}`),
    radioGet(`/json/stations/search?${tagParams}`),
  ]);
  const rows = [
    ...(byName.status === "fulfilled" ? byName.value : []),
    ...(byTag.status === "fulfilled" ? byTag.value : []),
  ];
  const seen = new Set<string>();
  const tracks: Track[] = [];
  for (const row of rows) {
    const t = stationTrack(row);
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    tracks.push(t);
  }
  return tracks;
}

export async function stationsByLanguage(language: string): Promise<Track[]> {
  const params = new URLSearchParams({
    language,
    limit: "24",
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    codec: "mp3",
  });
  try {
    const rows = await radioGet(`/json/stations/search?${params}`);
    return rows.map(stationTrack).filter((t): t is Track => !!t);
  } catch {
    return [];
  }
}

/** Always-available legal internet radio (stations publish these URLs for players). */
export const FALLBACK_RADIO: Record<"punjabi" | "hindi" | "english", Track[]> = {
  punjabi: [
    radio("Punjabi Hits Radio", "Punjabi live", "https://stream.zeno.fm/rqqps6cbe3quv", "punjabi-hits"),
    radio("Desi Punjabi Radio", "Punjabi live", "https://stream.zeno.fm/60ef4p33vxquv", "desi-punjabi"),
    radio("Punjabi Sounds", "Punjabi · Hindi", "https://stream.zeno.fm/szh29dk5k1duv", "punjabi-sounds"),
    radio("Bollywood Punjabi Mix", "Hindi · Punjabi", "https://stream.zeno.fm/1k0ywdh2qv5tv", "pb-mix"),
  ],
  hindi: [
    radio("Bollywood Hits", "Hindi live", "https://stream.zeno.fm/rqqps6cbe3quv", "bolly-hits"),
    radio("Classic Bollywood Radio", "Hindi live", "https://stream.zeno.fm/60ef4p33vxquv", "bolly-classic"),
    radio("Hindi Gold", "Hindi live", "https://stream.zeno.fm/u7g7k5ys8neuv", "hindi-gold"),
    radio("Filmi Radio", "Hindi live", "https://stream.zeno.fm/nahskuxf7f0uv", "filmi"),
  ],
  english: [
    radio("SomaFM Indie Pop Rocks", "English indie", "https://ice4.somafm.com/indiepop-128-mp3", "indiepop"),
    radio("SomaFM Groove Salad", "English chill", "https://ice4.somafm.com/groovesalad-128-mp3", "groove"),
    radio("SomaFM PopTron", "English electropop", "https://ice4.somafm.com/poptron-128-mp3", "poptron"),
    radio("SomaFM BAGeL Radio", "English alt", "https://ice4.somafm.com/bagel-128-mp3", "bagel"),
    radio("SomaFM Left Coast 70s", "English 70s", "https://ice4.somafm.com/seventies-128-mp3", "70s"),
    radio("Radio Paradise", "English mix", "https://stream.radioparadise.com/mp3-192", "paradise"),
    radio("SomaFM Suburbs of Goa", "Desi-influenced electronic", "https://ice4.somafm.com/suburbsofgoa-128-mp3", "goa"),
  ],
};

function radio(title: string, artist: string, streamUrl: string, id: string): Track {
  return {
    id: `radio:${id}`,
    title,
    artist,
    album: "Live radio",
    artwork: placeholderArt(id),
    duration: 0,
    streamUrl,
    source: "radio",
    live: true,
    license: "Live radio — station stream",
  };
}

export async function genreStations(genre: "punjabi" | "hindi" | "english"): Promise<Track[]> {
  const lang = genre === "punjabi" ? "punjabi" : genre === "hindi" ? "hindi" : "english";
  const queries = {
    punjabi: ["punjabi", "bhangra"],
    hindi: ["bollywood", "hindi"],
    english: ["pop", "top hits"],
  }[genre];
  try {
    const [langTracks, ...searches] = await Promise.all([
      stationsByLanguage(lang),
      ...queries.map((q) => searchRadioStations(q)),
    ]);
    const all = [...langTracks, ...searches.flat(), ...FALLBACK_RADIO[genre]];
    const seen = new Set<string>();
    const out: Track[] = [];
    for (const t of all) {
      if (seen.has(t.streamUrl) || seen.has(t.id)) continue;
      seen.add(t.streamUrl);
      seen.add(t.id);
      out.push(t);
    }
    return out.slice(0, 40);
  } catch {
    return FALLBACK_RADIO[genre];
  }
}
