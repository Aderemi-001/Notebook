-- Create a table to track payment attempts and history
create table public.payment_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  amount decimal(10,2) not null,
  currency text default 'ZAR',
  status text not null default 'pending', -- 'pending', 'complete', 'failed', 'cancelled'
  provider text default 'payfast',
  provider_ref text, -- PayFast pf_payment_id
  metadata jsonb, -- Store extra details like plan_id, billing_cycle
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.payment_transactions enable row level security;

-- Allow users to read their own transactions
create policy "Users can view own transactions"
  on public.payment_transactions for select
  using ( auth.uid() = user_id );

-- Allow insert (authenticated users can start a transaction log)
create policy "Users can insert own transactions"
  on public.payment_transactions for insert
  with check ( auth.uid() = user_id );

-- Only Service Role (Backend) can update status to 'complete'
-- (No update policy for public users ensures they can't fake success)
