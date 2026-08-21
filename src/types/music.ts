export type RepeatMode = "off" | "all" | "one";

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  artwork: string;
  duration: number;
  streamUrl: string;
  source: "audius" | "jamendo" | "archive" | "local" | "radio";
  live?: boolean;
  license?: string;
  permalink?: string;
}

export interface Artist {
  id: string;
  name: string;
  artwork: string;
  source: Track["source"];
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  source: Track["source"];
}

export interface RemotePlaylist {
  id: string;
  title: string;
  artwork: string;
  description?: string;
  source: Track["source"];
}

export interface UserPlaylist {
  id: string;
  name: string;
  description: string;
  trackIds: string[];
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: RemotePlaylist[];
}
