-- RPC: Delete Own Account (User Self-Service)
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete the executing user from auth.users (cascades to public tables)
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
