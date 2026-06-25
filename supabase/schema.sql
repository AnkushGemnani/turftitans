-- TurfTitans Supabase schema
-- Run this file in the Supabase SQL editor for a new project.

create extension if not exists "pgcrypto";

-- ---------- Enums ----------

create type public.player_role as enum (
  'batsman',
  'bowler',
  'all_rounder',
  'wicket_keeper'
);

create type public.tournament_status as enum (
  'draft',
  'open',
  'locked',
  'auction',
  'completed',
  'cancelled'
);

create type public.registration_status as enum (
  'pending_payment',
  'payment_uploaded',
  'approved',
  'rejected',
  'waitlisted',
  'withdrawn'
);

create type public.payment_status as enum (
  'pending',
  'submitted',
  'approved',
  'rejected'
);

create type public.auction_purchase_status as enum (
  'sold',
  'returned',
  'skipped'
);

-- ---------- Helpers ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Tables ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text unique,
  phone text,
  avatar_url text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  rules text,
  location text not null,
  start_date date not null,
  end_date date,
  registration_deadline timestamptz not null,
  registration_fee integer not null default 0 check (registration_fee >= 0),
  max_players integer not null check (max_players > 0),
  number_of_teams integer not null check (number_of_teams > 1),
  team_budget integer not null check (team_budget > 0),
  banner_path text,
  banner_url text,
  banner_storage_path text,
  upi_qr_path text,
  upi_id text,
  payment_instructions text,
  status public.tournament_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_tournament_per_creator unique (creator_id),
  constraint valid_tournament_dates check (end_date is null or end_date >= start_date)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.player_role not null,
  profile_image_path text,
  status public.registration_status not null default 'pending_payment',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_registration_per_tournament unique (tournament_id, user_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount >= 0),
  screenshot_path text,
  status public.payment_status not null default 'pending',
  creator_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  logo_path text,
  budget integer not null check (budget > 0),
  remaining_budget integer not null check (remaining_budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_team_name_per_tournament unique (tournament_id, name)
);

create table public.auction_purchases (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  purchase_amount integer not null default 0 check (purchase_amount >= 0),
  status public.auction_purchase_status not null default 'sold',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint one_final_auction_result_per_player unique (tournament_id, registration_id)
);

-- ---------- Auth user profile sync ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone = excluded.phone,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- Table-aware helpers ----------

create or replace function public.is_tournament_creator(target_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id = target_tournament_id
      and t.creator_id = auth.uid()
  );
$$;

create or replace function public.approved_registration_count(target_tournament_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer
  from public.registrations r
  where r.tournament_id = target_tournament_id
    and r.status = 'approved';
$$;

create or replace function public.team_spend(target_team_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(sum(ap.purchase_amount), 0)::integer
  from public.auction_purchases ap
  where ap.team_id = target_team_id
    and ap.status = 'sold';
$$;

create or replace function public.refresh_team_remaining_budget()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_team_id uuid;
  old_team_id uuid;
begin
  new_team_id = case when tg_op in ('INSERT', 'UPDATE') then new.team_id else null end;
  old_team_id = case when tg_op in ('UPDATE', 'DELETE') then old.team_id else null end;

  if old_team_id is not null then
    update public.teams
    set remaining_budget = budget - public.team_spend(old_team_id)
    where id = old_team_id;
  end if;

  if new_team_id is not null and new_team_id is distinct from old_team_id then
    update public.teams
    set remaining_budget = budget - public.team_spend(new_team_id)
    where id = new_team_id;
  end if;

  return coalesce(new, old);
end;
$$;

-- ---------- Triggers ----------

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_tournaments_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

create trigger set_registrations_updated_at
before update on public.registrations
for each row execute function public.set_updated_at();

create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger set_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger refresh_budget_after_purchase_insert
after insert on public.auction_purchases
for each row execute function public.refresh_team_remaining_budget();

create trigger refresh_budget_after_purchase_update
after update on public.auction_purchases
for each row execute function public.refresh_team_remaining_budget();

create trigger refresh_budget_after_purchase_delete
after delete on public.auction_purchases
for each row execute function public.refresh_team_remaining_budget();

-- ---------- Indexes ----------

create index tournaments_creator_idx on public.tournaments (creator_id);
create index tournaments_search_idx on public.tournaments using gin (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(location, '') || ' ' || coalesce(description, ''))
);
create index tournaments_date_location_idx on public.tournaments (start_date, location);
create index registrations_tournament_status_idx on public.registrations (tournament_id, status);
create index registrations_user_idx on public.registrations (user_id);
create index payments_tournament_status_idx on public.payments (tournament_id, status);
create index teams_tournament_idx on public.teams (tournament_id);
create index auction_purchases_tournament_idx on public.auction_purchases (tournament_id, created_at desc);

-- ---------- Budget safety ----------

create or replace function public.prevent_overspend()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_remaining integer;
  reusable_amount integer := 0;
begin
  if new.status = 'sold' then
    if tg_op = 'UPDATE'
      and old.status = 'sold'
      and old.team_id = new.team_id
    then
      reusable_amount = old.purchase_amount;
    end if;

    select remaining_budget
    into current_remaining
    from public.teams
    where id = new.team_id
    for update;

    if current_remaining is null then
      raise exception 'A sold player must be assigned to a team.';
    end if;

    if new.purchase_amount > current_remaining + reusable_amount then
      raise exception 'Purchase amount exceeds remaining team budget.';
    end if;
  end if;

  return new;
end;
$$;

create trigger prevent_auction_overspend
before insert or update on public.auction_purchases
for each row execute function public.prevent_overspend();

-- ---------- Storage buckets ----------

insert into storage.buckets (id, name, public)
values
  ('tournament-banners', 'tournament-banners', true),
  ('upi-qr', 'upi-qr', false),
  ('profile-images', 'profile-images', true),
  ('payment-screenshots', 'payment-screenshots', false),
  ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.registrations enable row level security;
alter table public.payments enable row level security;
alter table public.teams enable row level security;
alter table public.auction_purchases enable row level security;

create policy "Profiles are visible to authenticated users"
on public.profiles for select
to authenticated
using (true);

create policy "Users create their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "Users update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Authenticated users browse tournaments"
on public.tournaments for select
to authenticated
using (true);

create policy "Users create one tournament"
on public.tournaments for insert
to authenticated
with check (creator_id = auth.uid());

create policy "Creators update their tournaments"
on public.tournaments for update
to authenticated
using (creator_id = auth.uid())
with check (creator_id = auth.uid());

create policy "Creators delete tournaments"
on public.tournaments for delete
to authenticated
using (creator_id = auth.uid());

create policy "Users and creators view registrations"
on public.registrations for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
);

create policy "Users join open tournaments"
on public.registrations for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tournaments t
    where t.id = tournament_id
      and t.creator_id <> auth.uid()
      and t.status = 'open'
      and t.registration_deadline > now()
      and public.approved_registration_count(t.id) < t.max_players
  )
);

create policy "Users or creators update registrations"
on public.registrations for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
)
with check (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
);

create policy "Users and creators view payments"
on public.payments for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
);

create policy "Users create their payment record"
on public.payments for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.registrations r
    where r.id = registration_id
      and r.user_id = auth.uid()
      and r.tournament_id = tournament_id
  )
);

create policy "Users upload screenshots and creators review payments"
on public.payments for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
)
with check (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
);

create policy "Tournament members view teams"
on public.teams for select
to authenticated
using (
  public.is_tournament_creator(tournament_id)
  or exists (
    select 1
    from public.registrations r
    where r.tournament_id = teams.tournament_id
      and r.user_id = auth.uid()
      and r.status = 'approved'
  )
);

create policy "Creators manage teams"
on public.teams for all
to authenticated
using (public.is_tournament_creator(tournament_id))
with check (public.is_tournament_creator(tournament_id));

create policy "Tournament members view auction history"
on public.auction_purchases for select
to authenticated
using (
  public.is_tournament_creator(tournament_id)
  or exists (
    select 1
    from public.registrations r
    where r.tournament_id = auction_purchases.tournament_id
      and r.user_id = auth.uid()
      and r.status = 'approved'
  )
);

create policy "Creators manage auction purchases"
on public.auction_purchases for all
to authenticated
using (public.is_tournament_creator(tournament_id))
with check (public.is_tournament_creator(tournament_id));

-- ---------- Storage RLS ----------

create policy "Public banner read"
on storage.objects for select
to authenticated
using (bucket_id in ('tournament-banners', 'profile-images', 'team-logos'));

create policy "Authenticated users upload public images"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('tournament-banners', 'profile-images', 'team-logos')
  and owner = auth.uid()
);

create policy "Owners update public images"
on storage.objects for update
to authenticated
using (
  bucket_id in ('tournament-banners', 'profile-images', 'team-logos')
  and owner = auth.uid()
)
with check (owner = auth.uid());

create policy "Owners delete public images"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('tournament-banners', 'profile-images', 'team-logos')
  and owner = auth.uid()
);

create policy "Users upload private payment files"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('upi-qr', 'payment-screenshots')
  and owner = auth.uid()
);

create policy "Owners read private payment files"
on storage.objects for select
to authenticated
using (
  bucket_id in ('upi-qr', 'payment-screenshots')
  and owner = auth.uid()
);

-- Tournament creators also need access to payment evidence and UPI QR files.
-- The application should generate short-lived signed URLs from server routes after checking ownership.
