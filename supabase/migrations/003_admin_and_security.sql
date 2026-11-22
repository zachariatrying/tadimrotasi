-- TadımRotası v2.2 — Admin Role, Privilege-Escalation Guard & Admin Venue Policies
-- Run inside Supabase SQL Editor

alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Prevent any authenticated client from setting is_admin = true via API
create or replace function public.prevent_self_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' then
      new.is_admin := false;
    else
      new.is_admin := coalesce(old.is_admin, false);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_admin on public.profiles;
create trigger trg_prevent_self_admin
  before insert or update on public.profiles
  for each row execute function public.prevent_self_admin();

-- Allow verified admins to update or delete any venue globally
drop policy if exists "Admins can update any venue" on public.venues;
create policy "Admins can update any venue" on public.venues
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "Admins can delete any venue" on public.venues;
create policy "Admins can delete any venue" on public.venues
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
