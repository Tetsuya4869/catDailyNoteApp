-- Cat Daily Note: initial Supabase schema
-- Apply with Supabase CLI or the SQL editor.

create table if not exists public.cats (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  gender text check (gender in ('male','female','unknown')),
  birth_date date,
  weight_goal numeric(5,2),
  photo_uri text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.diary_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  cat_id text references public.cats(id) on delete set null,
  date date not null,
  title text not null,
  content text not null default '',
  mood text not null check (mood in ('happy','sleepy','playful','hungry','relaxed')),
  category text check (category in ('meal','play','sleep','health','grooming','other')),
  favorite boolean not null default false,
  photo_uri text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  cat_id text not null references public.cats(id) on delete cascade,
  type text not null check (type in ('weight','vet','vaccine','medication')),
  date date not null,
  weight_kg numeric(5,2),
  title text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  cat_id text not null references public.cats(id) on delete cascade,
  type text not null check (type in ('vet','vaccine')),
  date date not null,
  title text not null,
  note text,
  done boolean not null default false
);

create index if not exists diary_entries_user_date_idx on public.diary_entries(user_id, date desc);
create index if not exists health_records_user_cat_date_idx on public.health_records(user_id, cat_id, date desc);
create index if not exists appointments_user_cat_date_idx on public.appointments(user_id, cat_id, date);

alter table public.cats enable row level security;
alter table public.diary_entries enable row level security;
alter table public.health_records enable row level security;
alter table public.appointments enable row level security;

create policy "cats_owner_all" on public.cats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diary_owner_all" on public.diary_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "health_owner_all" on public.health_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "appointments_owner_all" on public.appointments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('cat-media', 'cat-media', true)
on conflict (id) do update set public = excluded.public;

create policy "cat_media_read" on storage.objects for select using (bucket_id = 'cat-media');
create policy "cat_media_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'cat-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cat_media_update" on storage.objects for update to authenticated
using (bucket_id = 'cat-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'cat-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cat_media_delete" on storage.objects for delete to authenticated
using (bucket_id = 'cat-media' and (storage.foldername(name))[1] = auth.uid()::text);
