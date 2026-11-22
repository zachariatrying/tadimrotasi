-- TadımRotası v2.0 — Supabase PostgreSQL Schema + Row-Level Security (RLS)
-- Run inside Supabase SQL Editor or via `supabase db push`

create extension if not exists "pgcrypto";

-- 1. User Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  display_name text not null,
  home_city text not null default 'İstanbul',
  bio text default ''
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Venues (Shared + User-Submitted Turkey Venues)
create table if not exists public.venues (
  id text primary key,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  city text not null,
  district text not null,
  category text not null,
  price_tier text not null check (price_tier in ('₺', '₺₺', '₺₺₺')),
  lat double precision not null,
  lng double precision not null,
  signature_dish text default '',
  source_url text,
  source_platform text,
  created_at timestamptz not null default now()
);

-- 3. User Elo Rankings ("Gittiklerim")
create table if not exists public.user_rankings (
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_id text not null references public.venues(id) on delete cascade,
  tier text not null check (tier in ('bayildim', 'guzeldi', 'idare')),
  rank_index integer not null,
  score numeric(3,1) not null check (score >= 0 and score <= 10),
  visited_at date not null default current_date,
  personal_note text default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);

-- 4. Want-to-Go Bucket List ("Gideceklerim")
create table if not exists public.want_to_go (
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_id text not null references public.venues(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);

-- 5. Enable Row-Level Security
alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.user_rankings enable row level security;
alter table public.want_to_go enable row level security;

-- Profiles Policies
create policy "Public profiles readable" on public.profiles
  for select using (is_public = true or auth.uid() = id);
create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Venues Policies
create policy "Anyone can read venues" on public.venues
  for select using (true);
create policy "Authenticated users can insert venues" on public.venues
  for insert with check (auth.uid() is not null);
create policy "Creators can update own venues" on public.venues
  for update using (auth.uid() = created_by);

-- Rankings Policies
create policy "Public rankings readable" on public.user_rankings
  for select using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles p where p.id = user_id and p.is_public = true)
  );
create policy "Users manage own rankings" on public.user_rankings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Want-to-Go Policies
create policy "Users manage own want_to_go" on public.want_to_go
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. App Store Guideline 5.1.1(v) & KVKK Compliance: Self-Service Account & Data Deletion
create or replace function public.delete_my_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.want_to_go where user_id = auth.uid();
  delete from public.user_rankings where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();
end;
$$;
