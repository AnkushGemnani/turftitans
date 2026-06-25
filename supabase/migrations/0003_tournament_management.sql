-- Milestone 3 tournament management changes.

alter table public.tournaments
add column if not exists rules text,
add column if not exists banner_url text,
add column if not exists banner_storage_path text;
