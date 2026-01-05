-- Create a table to store essay submissions and their grades
create table if not exists public.essay_submissions (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references public.essay_questions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  score integer,
  letter_grade text,
  feedback text,
  metrics jsonb, -- Stores the detailed metrics (word count, readability, etc.)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.essay_submissions enable row level security;

-- Policies
create policy "Users can view their own submissions"
  on public.essay_submissions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own submissions"
  on public.essay_submissions for insert
  with check (auth.uid() = user_id);

-- Optional: Create an index for faster querying by user/question
create index if not exists essay_submissions_user_question_idx
  on public.essay_submissions (user_id, question_id);
