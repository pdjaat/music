import type { RemotePlaylist, Track } from "../types/music";
import { placeholderArt } from "../utils/format";

export const CATALOG: Track[] = [
  { id: "local:aurora", title: "Aurora Drift", artist: "Northline", album: "Polaris", artwork: placeholderArt("aurora"), duration: 28, streamUrl: "/audio/aurora.wav", source: "local", license: "Original Lumen catalog" },
  { id: "local:ember", title: "Ember Nights", artist: "Kiln", album: "Afterglow", artwork: placeholderArt("ember"), duration: 26, streamUrl: "/audio/ember-nights.wav", source: "local", license: "Original Lumen catalog" },
  { id: "local:glass", title: "Glass Garden", artist: "Lumen Ensemble", album: "Conservatory", artwork: placeholderArt("glass"), duration: 24, streamUrl: "/audio/glass-garden.wav", source: "local", license: "Original Lumen catalog" },
  { id: "local:north", title: "Northbound", artist: "Northline", album: "Polaris", artwork: placeholderArt("north"), duration: 30, streamUrl: "/audio/northbound.wav", source: "local", license: "Original Lumen catalog" },
  { id: "local:pulse", title: "Pulse City", artist: "Gridlock", album: "Metro", artwork: placeholderArt("pulse"), duration: 22, streamUrl: "/audio/pulse-city.wav", source: "local", license: "Original Lumen catalog" },
  { id: "local:saffron", title: "Saffron Air", artist: "Raga Room", album: "Spice Routes", artwork: placeholderArt("saffron"), duration: 27, streamUrl: "/audio/saffron.wav", source: "local", license: "Original Lumen catalog" },
  { id: "local:tidal", title: "Tidal", artist: "Harbour", album: "Low Tide", artwork: placeholderArt("tidal"), duration: 32, streamUrl: "/audio/tidal.wav", source: "local", license: "Original Lumen catalog" },
  { id: "local:violet", title: "Violet Hour", artist: "Kiln", album: "Afterglow", artwork: placeholderArt("violet"), duration: 25, streamUrl: "/audio/violet-hour.wav", source: "local", license: "Original Lumen catalog" },
  { id: "local:kites", title: "Paper Kites", artist: "Harbour", album: "Low Tide", artwork: placeholderArt("kites"), duration: 23, streamUrl: "/audio/paper-kites.wav", source: "local", license: "Original Lumen catalog" },
  { id: "local:copper", title: "Copper Wire", artist: "Gridlock", album: "Metro", artwork: placeholderArt("copper"), duration: 21, streamUrl: "/audio/copper-wire.wav", source: "local", license: "Original Lumen catalog" },
  { id: "local:monsoon", title: "Monsoon", artist: "Raga Room", album: "Spice Routes", artwork: placeholderArt("monsoon"), duration: 29, streamUrl: "/audio/monsoon.wav", source: "local", license: "Original Lumen catalog" },
  { id: "local:lanterns", title: "Lanterns", artist: "Lumen Ensemble", album: "Conservatory", artwork: placeholderArt("lanterns"), duration: 26, streamUrl: "/audio/lanterns.wav", source: "local", license: "Original Lumen catalog" },
];

export const FEATURED_PLAYLISTS: RemotePlaylist[] = [
  { id: "pl:night", title: "Night Signals", artwork: placeholderArt("night"), description: "Slow glow", source: "local" },
  { id: "pl:city", title: "City Pulse", artwork: placeholderArt("city"), description: "Gridlock & Metro", source: "local" },
  { id: "pl:tide", title: "Harbour Hours", artwork: placeholderArt("harbour"), description: "Tides and kites", source: "local" },
  { id: "pl:spice", title: "Spice Routes", artwork: placeholderArt("spice"), description: "Raga Room", source: "local" },
];

export function searchCatalog(q: string): Track[] {
  const n = q.trim().toLowerCase();
  if (!n) return [];
  return CATALOG.filter(
    (t) =>
      t.title.toLowerCase().includes(n) ||
      t.artist.toLowerCase().includes(n) ||
      (t.album || "").toLowerCase().includes(n)
  );
}
