-- Fix user_preferences schema
create table if not exists public.user_preferences (
  user_id uuid references auth.users(id) on delete cascade primary key,
  default_flashcard_side text default 'term',
  confirm_deletion boolean default true,
  default_num_exam_questions integer default 10,
  default_exam_question_types text[] default array['multiple_choice', 'true_false'],
  daily_cards_goal integer default 20,
  enable_review_reminders boolean default false,
  default_study_session_cards_count integer default 20,
  default_card_sort_order text default 'next_review_at_asc',
  hide_mastered_from_daily_review boolean default false,
  font_size_preference text default 'medium',
  enable_sound_effects boolean default true,
  enable_tts boolean default true,
  enable_animations boolean default true
);

-- Add missing columns if they don't exist
alter table public.user_preferences add column if not exists preferred_language text default 'en';
alter table public.user_preferences add column if not exists enable_sound_effects boolean default true;
alter table public.user_preferences add column if not exists enable_tts boolean default true;
alter table public.user_preferences add column if not exists enable_animations boolean default true;

-- Ensure RLS is enabled
alter table public.user_preferences enable row level security;

-- Policies for user_preferences
drop policy if exists "Users can view their own preferences" on public.user_preferences;
create policy "Users can view their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id)
  on conflict (user_id) do update set
    default_flashcard_side = excluded.default_flashcard_side,
    confirm_deletion = excluded.confirm_deletion,
    default_num_exam_questions = excluded.default_num_exam_questions,
    default_exam_question_types = excluded.default_exam_question_types,
    daily_cards_goal = excluded.daily_cards_goal,
    enable_review_reminders = excluded.enable_review_reminders,
    default_study_session_cards_count = excluded.default_study_session_cards_count,
    default_card_sort_order = excluded.default_card_sort_order,
    hide_mastered_from_daily_review = excluded.hide_mastered_from_daily_review,
    font_size_preference = excluded.font_size_preference,
    enable_sound_effects = excluded.enable_sound_effects,
    enable_tts = excluded.enable_tts,
    enable_animations = excluded.enable_animations,
    preferred_language = excluded.preferred_language;

drop policy if exists "Users can update their own preferences update" on public.user_preferences;
create policy "Users can update their own preferences update"
  on public.user_preferences for update
  using (auth.uid() = user_id);

-- Ensure user_progress columns exist (fixing 406 errors)
alter table public.user_progress add column if not exists repetition_level integer default 0;
alter table public.user_progress add column if not exists ease_factor float default 2.5;
alter table public.user_progress add column if not exists next_review_at timestamp with time zone default now();
alter table public.user_progress add column if not exists status text default 'learning';
alter table public.user_progress add column if not exists last_reviewed_at timestamp with time zone default now();

-- Grant permissions to ensure no 403/406 issues
grant all on public.user_preferences to authenticated;
grant all on public.user_preferences to service_role;
grant all on public.user_progress to authenticated;
grant all on public.user_progress to service_role;
