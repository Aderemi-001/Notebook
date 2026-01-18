create or replace function public.get_dashboard_stats()
returns table (
    sets_mastered bigint,
    concept_gems bigint,
    mastery_rate integer,
    streak integer
)
language plpgsql
security definer
as $$
declare
    v_user_id uuid;
    v_sets_mastered bigint := 0;
    v_concept_gems bigint := 0;
    v_mastery_rate integer := 0;
    v_streak integer := 0;
    
    total_cards_reviewed bigint := 0;
    mastered_cards bigint := 0;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return; -- Return empty if not logged in
    end if;

    -- 1. Concept Gems (Total Concepts)
    select count(*) into v_concept_gems
    from public.concepts
    where user_id = v_user_id;

    -- 2. Mastery Rate (Cards Mastered / Total Progress)
    select 
        count(*),
        count(*) filter (where status = 'mastered' or repetition_level >= 4)
    into total_cards_reviewed, mastered_cards
    from public.user_progress
    where user_id = v_user_id;

    if total_cards_reviewed > 0 then
        v_mastery_rate := round((mastered_cards::float * 100.0) / total_cards_reviewed::float)::integer;
    else
        v_mastery_rate := 0;
    end if;

    -- 3. Sets Mastered Logic
    -- A set is deemed "mastered" if the user has progress on > 80% of its cards 
    -- AND > 80% of those cards are at mastery level >= 4.
    -- This query is complex, so we simplify for version 1:
    -- Count sets where the user has at least 5 mastered cards (basic heuristic)
    -- OR, strict approach:
    with set_stats as (
        select 
            c.set_id,
            count(c.id) as total_set_cards,
            count(up.card_id) filter (where up.status = 'mastered' or up.repetition_level >= 4) as user_mastered_cards
        from public.cards c
        join public.user_progress up on c.id = up.card_id
        where up.user_id = v_user_id
        group by c.set_id
    )
    select count(*) into v_sets_mastered
    from set_stats
    where total_set_cards > 0 
      and (user_mastered_cards::float / total_set_cards::float) >= 0.8;

    -- 4. Streak
    select current_streak into v_streak
    from public.profiles 
    where id = v_user_id;

    return query select 
        v_sets_mastered, 
        v_concept_gems, 
        v_mastery_rate, 
        coalesce(v_streak, 0);
end;
$$;
