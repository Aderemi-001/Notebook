-- 1. Create Tracking Table
create table if not exists public.magic_fix_tracking (
  user_id uuid references auth.users not null,
  usage_date date not null default current_date,
  usage_count int not null default 0,
  primary key (user_id, usage_date)
);

-- 2. Enable RLS
alter table public.magic_fix_tracking enable row level security;

-- 3. Policy (Users can see their own usage)
create policy "Users can view own tracking" on public.magic_fix_tracking
  for select using (auth.uid() = user_id);

-- 4. Function to Check Usage
create or replace function public.check_magic_fix_usage()
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_pro boolean;
  v_count int;
  v_limit int := 3; -- Limit set to 3
begin
  -- Check subscription status
  select exists (
    select 1 from subscriptions 
    where user_id = v_user_id 
    and (status = 'active' or status = 'trialing')
  ) into v_is_pro;

  -- Admin override
  if exists (select 1 from profiles where id = v_user_id and is_admin = true) then
    v_is_pro := true;
  end if;

  -- Pro users have no limit
  if v_is_pro then
    return json_build_object('allowed', true, 'remaining', 9999, 'is_pro', true);
  end if;

  -- Check today's usage
  select usage_count into v_count 
  from magic_fix_tracking 
  where user_id = v_user_id and usage_date = current_date;

  v_count := coalesce(v_count, 0);

  if v_count >= v_limit then
    return json_build_object('allowed', false, 'remaining', 0, 'is_pro', false);
  else
    return json_build_object('allowed', true, 'remaining', v_limit - v_count, 'is_pro', false);
  end if;
end;
$$;

-- 5. Function to Increment Usage
create or replace function public.increment_magic_fix_usage()
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_pro boolean;
begin
  -- Check subscription status
  select exists (
    select 1 from subscriptions 
    where user_id = v_user_id 
    and (status = 'active' or status = 'trialing')
  ) into v_is_pro;
  
   -- Admin override
  if exists (select 1 from profiles where id = v_user_id and is_admin = true) then
    v_is_pro := true;
  end if;

  -- Do not increment for Pro users
  if v_is_pro then return; end if;

  -- Increment count for today
  insert into magic_fix_tracking (user_id, usage_date, usage_count)
  values (v_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set usage_count = magic_fix_tracking.usage_count + 1;
end;
$$;
