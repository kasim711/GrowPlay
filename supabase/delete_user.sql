-- Comprehensive account deletion function
-- Run this in your Supabase Dashboard -> SQL Editor

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Wipe all data from public tables first
  DELETE FROM public.trades WHERE user_id = current_user_id;
  DELETE FROM public.holdings WHERE user_id = current_user_id;
  DELETE FROM public.lesson_progress WHERE user_id = current_user_id;
  DELETE FROM public.profiles WHERE id = current_user_id;

  -- 2. Delete from auth.users
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user() TO authenticated;
