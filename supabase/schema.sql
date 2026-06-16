-- Memory Fields Database Schema

create extension if not exists "uuid-ossp";

create table rooms (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null default 'Untitled Field',
  host_client_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table tracks (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade not null,
  original_filename text not null,
  display_name text not null,
  file_url text not null,
  file_size bigint not null,
  mime_type text not null,
  duration real,
  uploaded_at timestamptz default now(),
  uploaded_by_display_name text not null,
  status text not null default 'uploading' check (status in ('uploading','processing','ready','failed')),
  upload_progress real default 0,
  last_played_at timestamptz
);

create table room_state (
  room_id uuid primary key references rooms(id) on delete cascade,
  current_track_id uuid references tracks(id) on delete set null,
  is_playing boolean default false,
  current_time real default 0,
  started_at timestamptz,
  paused_at timestamptz,
  updated_at timestamptz default now(),
  visual_model text default 'signal-field',
  visual_sub_mode text,
  visual_seed integer default 42,
  visual_params jsonb default '{}',
  ascii_settings jsonb,
  palette_mode text default 'mineral' check (palette_mode in ('mineral','spectral'))
);

create table connected_clients (
  client_id text not null,
  room_id uuid references rooms(id) on delete cascade not null,
  display_name text not null,
  role text not null check (role in ('host','listener')),
  joined_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  primary key (client_id, room_id)
);

-- RLS
alter table rooms enable row level security;
alter table tracks enable row level security;
alter table room_state enable row level security;
alter table connected_clients enable row level security;

create policy "Public access for MVP" on rooms for all using (true) with check (true);
create policy "Public access for MVP" on tracks for all using (true) with check (true);
create policy "Public access for MVP" on room_state for all using (true) with check (true);
create policy "Public access for MVP" on connected_clients for all using (true) with check (true);

-- Indexes
create index tracks_room_id_idx on tracks(room_id);
create index tracks_uploaded_at_idx on tracks(uploaded_at desc);
create index connected_clients_room_id_idx on connected_clients(room_id);

-- Realtime
alter publication supabase_realtime add table room_state;
alter publication supabase_realtime add table tracks;
alter publication supabase_realtime add table connected_clients;
