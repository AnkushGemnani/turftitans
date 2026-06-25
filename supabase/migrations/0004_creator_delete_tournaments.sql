-- Milestone 3 requires creators to delete their tournaments.

drop policy if exists "Creators delete draft tournaments" on public.tournaments;
drop policy if exists "Creators delete tournaments" on public.tournaments;

create policy "Creators delete tournaments"
on public.tournaments for delete
to authenticated
using (creator_id = auth.uid());
