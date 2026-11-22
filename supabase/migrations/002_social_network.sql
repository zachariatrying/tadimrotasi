-- TadımRotası v2.1 — Social Network (Follows + Delete Cascade)
-- Run inside Supabase SQL Editor or via `supabase db push`

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.follows enable row level security;

create policy "Users can read own follows" on public.follows
  for select using (auth.uid() = follower_id);

create policy "Users can follow public profiles" on public.follows
  for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow" on public.follows
  for delete using (auth.uid() = follower_id);

-- Keep KVKK & App Store 5.1.1(v) self-service deletion complete
create or replace function public.delete_my_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.follows where follower_id = auth.uid() or following_id = auth.uid();
  delete from public.want_to_go where user_id = auth.uid();
  delete from public.user_rankings where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();
end;
$$;
