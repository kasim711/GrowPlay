-- Function to allow authenticated users to delete their own account completely
-- Run this in your Supabase Dashboard -> SQL Editor

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM auth.users WHERE id = auth.uid();
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION delete_user() TO authenticated;
