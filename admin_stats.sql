-- RPC to get Total and Today's Revenue
create or replace function public.admin_get_revenue()
returns json
language plpgsql
security definer
as $$
declare
  total_rev decimal;
  today_rev decimal;
begin
  select coalesce(sum(amount), 0) into total_rev from payment_transactions where status = 'completed';
  select coalesce(sum(amount), 0) into today_rev from payment_transactions where status = 'completed' and created_at >= current_date;
  
  return json_build_object('total', total_rev, 'today', today_rev);
end;
$$;

-- RPC to get Real Transaction Feed (joins with auth.users for email)
create or replace function public.admin_get_recent_transactions(limit_count int default 10)
returns table (
  id uuid,
  user_email text,
  amount decimal,
  status text,
  created_at timestamptz,
  plan text,
  provider_ref text
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    pt.id,
    u.email::text,
    pt.amount,
    pt.status,
    pt.created_at,
    (pt.metadata->>'item')::text,
    pt.provider_ref
  from payment_transactions pt
  left join auth.users u on pt.user_id = u.id
  order by pt.created_at desc
  limit limit_count;
end;
$$;
