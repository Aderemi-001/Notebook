-- Create essay_responses table for the new essay generator
create table if not exists public.essay_responses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  question_text text not null,
  user_answer text not null,
  score integer,
  feedback text,
  strengths text[],
  improvements text[],
  is_draft boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.essay_responses enable row level security;

-- Policies
create policy "Users can view their own essay responses"
  on public.essay_responses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own essay responses"
  on public.essay_responses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own essay responses"
  on public.essay_responses for update
  using (auth.uid() = user_id);

create policy "Users can delete their own essay responses"
  on public.essay_responses for delete
  using (auth.uid() = user_id);

-- Index
create index if not exists essay_responses_user_idx on public.essay_responses (user_id);
create index if not exists essay_responses_draft_idx on public.essay_responses (user_id, is_draft);
