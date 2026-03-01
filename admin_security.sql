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
  -- Using regclass is safer for OID lookup
  select exists(
    select 1 from pg_trigger t
    where t.tgrelid = 'public.profiles'::regclass
    and (t.tgname = 'prevent_admin_escalation' or t.tgname = 'protect_admin_column')
  ) into trigger_active;
  
  -- Fallback: if trigger is not found by name, check if the function 'prevent_admin_escalation' exists
  if not trigger_active then
    select exists(
      select 1 from pg_proc p
      join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'prevent_admin_escalation'
    ) into trigger_active;
  end if;

  return json_build_object(
    'rls_enabled', coalesce(rls_enabled, false),
    'escalation_protection', coalesce(trigger_active, false)
  );
end;
$$;
