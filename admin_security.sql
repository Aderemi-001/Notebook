-- RPC to check actual security configuration
create or replace function public.admin_get_security_status()
returns json
language plpgsql
security definer
as $$
declare
  rls_enabled boolean;
  trigger_active boolean;
begin
  -- 1. Check if RLS is enabled on 'profiles' table
  select rowsecurity into rls_enabled
  from pg_tables
  where schemaname = 'public' and tablename = 'profiles';

  -- 2. Check if the admin protection trigger exists
  -- (Assuming trigger name is 'on_auth_user_created' or similar, verifying specific protection trigger on profiles)
  -- Actually, let's check for 'secure_admin_status' trigger if it was named that, or just check generic trigger presence
  select exists(
    select 1 from pg_trigger t
    join pg_class c on t.tgrelid = c.oid
    where c.relname = 'profiles' 
    and (t.tgname = 'prevent_admin_escalation' or t.tgname = 'protect_admin_column')
  ) into trigger_active;
  
  -- If specific trigger doesn't exist, we might check for the function instead or just report false
  -- For now, let's assume we want to know if *any* trigger protecting update exists or if we need to verify a specific one.
  -- Let's just return what we find.

  return json_build_object(
    'rls_enabled', coalesce(rls_enabled, false),
    'escalation_protection', coalesce(trigger_active, false)
  );
end;
$$;
