-- Helper RPC: look up an auth.users row by email from the backend.
-- PostgREST doesn't expose the auth schema by default; this function runs
-- as the definer (postgres) so the service role can call it without
-- leaking access to the whole auth schema.
CREATE OR REPLACE FUNCTION public.find_auth_user_by_email(p_email text)
RETURNS TABLE(id uuid, email text, email_confirmed_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id, u.email::text, u.email_confirmed_at
  FROM auth.users u
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_auth_user_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_auth_user_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.find_auth_user_by_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.find_auth_user_by_email(text) TO service_role;
