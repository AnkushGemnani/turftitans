-- Drop unique constraint one_tournament_per_creator to allow creators to make multiple tournaments
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS one_tournament_per_creator;
