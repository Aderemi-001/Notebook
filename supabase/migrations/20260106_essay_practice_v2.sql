-- Create a table for essay questions
create table if not exists public.essay_questions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  question_text text not null,
  suggested_points text[], -- Store as array of strings
  study_set_id uuid references public.study_sets(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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
alter table public.essay_questions enable row level security;
alter table public.essay_submissions enable row level security;

-- Policies for Questions
create policy "Users can view their own questions or public ones"
  on public.essay_questions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own questions"
  on public.essay_questions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own questions"
  on public.essay_questions for delete
  using (auth.uid() = user_id);

-- Policies for Submissions
create policy "Users can view their own submissions"
  on public.essay_submissions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own submissions"
  on public.essay_submissions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own submissions"
  on public.essay_submissions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own submissions"
  on public.essay_submissions for delete
  using (auth.uid() = user_id);

-- Indexes
create index if not exists essay_questions_user_idx on public.essay_questions (user_id);
create index if not exists essay_submissions_user_question_idx on public.essay_submissions (user_id, question_id);
