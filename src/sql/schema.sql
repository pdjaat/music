-- Optional Supabase schema (use if you connect a project).
-- Local mode uses browser storage with the same logical model.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists playlist_tracks (
  playlist_id uuid references playlists(id) on delete cascade,
  track_id text not null,
  track jsonb not null,
  position int not null default 0,
  primary key (playlist_id, track_id)
);

create table if not exists favorites (
  user_id uuid references profiles(id) on delete cascade,
  track_id text not null,
  track jsonb not null,
  created_at timestamptz default now(),
  primary key (user_id, track_id)
);

create table if not exists recently_played (
  user_id uuid references profiles(id) on delete cascade,
  track_id text not null,
  track jsonb not null,
  played_at timestamptz default now(),
  primary key (user_id, track_id)
);

create table if not exists user_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  volume numeric default 0.85,
  shuffle boolean default false
);

alter table profiles enable row level security;
alter table playlists enable row level security;
alter table playlist_tracks enable row level security;
alter table favorites enable row level security;
alter table recently_played enable row level security;
alter table user_settings enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own playlists" on playlists for all using (auth.uid() = user_id);
create policy "own playlist tracks" on playlist_tracks for all using (
  exists (select 1 from playlists p where p.id = playlist_id and p.user_id = auth.uid())
);
create policy "own favorites" on favorites for all using (auth.uid() = user_id);
create policy "own recent" on recently_played for all using (auth.uid() = user_id);
create policy "own settings" on user_settings for all using (auth.uid() = user_id);

create index if not exists playlists_user_idx on playlists(user_id);
create index if not exists favorites_user_idx on favorites(user_id);
