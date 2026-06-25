-- Alter tournaments table to add upi_id and payment_instructions columns
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS upi_id text;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS payment_instructions text;
