-- 1. Update handle_new_user trigger to support Google OAuth profile picture under 'picture' key
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
    COALESCE(NULLIF(new.raw_user_meta_data ->> 'avatar_url', ''), NULLIF(new.raw_user_meta_data ->> 'picture', '')),
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

-- 2. Retroactively update existing profiles that are missing avatar_url but have Google picture meta
UPDATE public.profiles p
SET avatar_url = COALESCE(
  NULLIF(u.raw_user_meta_data ->> 'avatar_url', ''), 
  NULLIF(u.raw_user_meta_data ->> 'picture', '')
)
FROM auth.users u
WHERE p.id = u.id AND p.avatar_url IS NULL;
