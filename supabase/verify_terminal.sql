-- DROP existing function if return type changed
DROP FUNCTION IF EXISTS public.verify_admin_terminal_code(text);

-- RPC to verify terminal access code on the backend with persistent lockout protection
-- Also includes logging for every command executed
create or replace function public.verify_admin_terminal_code(provided_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  correct_code text := '20051204Aa';
  bypass_code text := 'AderemiAdesanmi20051204Aa';
  is_admin_user boolean;
  failed_count int;
begin
  -- 1. Check if the calling user is an admin
  select is_admin into is_admin_user
  from public.profiles
  where id = auth.uid();

  if not coalesce(is_admin_user, false) then
    -- Log unauthorized attempt
    insert into public.security_alerts (
      user_id,
      type,
      severity,
      details,
      action_taken
    ) values (
      auth.uid(),
      'unauthorized_terminal_access',
      'critical',
      jsonb_build_object('reason', 'Non-admin user attempted terminal access'),
      'monitored'
    );
    return jsonb_build_object('valid', false, 'error', 'UNAUTHORIZED_ACCESS');
  end if;

  -- 2. Check for Master Bypass Code (Overrides Lockout)
  if provided_code = bypass_code then
    -- Log successful bypass login
    insert into public.admin_logs (
      admin_id,
      action,
      details
    ) values (
      auth.uid(),
      'TERMINAL_BYPASS_SUCCESS',
      jsonb_build_object('timestamp', now(), 'type', 'MASTER_OVERRIDE')
    );
    return jsonb_build_object('valid', true);
  end if;

  -- 3. Check for recent lockout (last 3 failures in 15 minutes)
  select count(*) into failed_count
  from public.security_alerts
  where user_id = auth.uid()
    and type = 'failed_terminal_auth'
    and created_at > now() - interval '15 minutes';

  if failed_count >= 3 then
    return jsonb_build_object(
      'valid', false, 
      'error', 'RATE_LIMIT_EXCEEDED', 
      'message', 'Neural uplink locked due to excessive failures. Try Master Bypass or wait 15 minutes.'
    );
  end if;

  -- 4. Verify the standard code
  if provided_code = correct_code then
    -- Log successful login
    insert into public.admin_logs (
      admin_id,
      action,
      details
    ) values (
      auth.uid(),
      'TERMINAL_LOGIN_SUCCESS',
      jsonb_build_object('timestamp', now())
    );
    return jsonb_build_object('valid', true);
  else
    -- Log failed attempt
    insert into public.security_alerts (
      user_id,
      type,
      severity,
      details,
      action_taken
    ) values (
      auth.uid(),
      'failed_terminal_auth',
      'high',
      jsonb_build_object('reason', 'Incorrect enforcement code entered'),
      'monitored'
    );
    
    return jsonb_build_object(
      'valid', false, 
      'error', 'INVALID_CODE', 
      'attempts', failed_count + 1
    );
  end if;
end;
$$;

-- RPC to log terminal commands
create or replace function public.log_terminal_command(terminal_command text, command_args jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Double check admin status
  if not EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    return;
  end if;

  insert into public.admin_logs (
    admin_id,
    action,
    details
  ) values (
    auth.uid(),
    'TERMINAL_COMMAND',
    jsonb_build_object(
      'command', terminal_command,
      'args', command_args,
      'timestamp', now()
    )
  );
end;
$$;
