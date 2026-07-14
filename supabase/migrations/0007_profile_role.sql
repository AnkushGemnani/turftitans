-- 1. Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN role public.player_role;

-- 2. Update handle_new_user trigger function to populate role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(NULLIF(new.raw_user_meta_data ->> 'full_name', ''), SPLIT_PART(new.email, '@', 1)),
    NULLIF(new.raw_user_meta_data ->> 'phone', ''),
    NULLIF(new.raw_user_meta_data ->> 'avatar_url', ''),
    (new.raw_user_meta_data ->> 'role')::public.player_role
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    avatar_url = EXCLUDED.avatar_url,
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN new;
END;
$$;
