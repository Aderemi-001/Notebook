-- 1. Enhanced Content Search (Fixes Anonymous + Invalid Date)
create or replace function public.admin_search_content(search_query text)
returns table (
    id uuid,
    title text,
    description text,
    is_public boolean,
    created_at timestamptz,
    creator_email text,
    creator_name text,
    card_count bigint,
    match_source text
)
language plpgsql
security definer
as $$
begin
    -- Admin Check
    if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
        raise exception 'Access Denied';
    end if;

    return query
    select 
        s.id,
        s.title,
        s.description,
        s.is_public,
        s.created_at,
        u.email::text as creator_email,
        p.display_name as creator_name,
        (select count(*) from public.cards c where c.set_id = s.id) as card_count,
        'metadata' as match_source
    from public.study_sets s
    join public.profiles p on s.user_id = p.id
    join auth.users u on s.user_id = u.id
    where 
        (search_query = '' or search_query is null) -- Return recent if empty
        or (s.title ilike '%' || search_query || '%')
        or (s.description ilike '%' || search_query || '%')
        or (u.email ilike '%' || search_query || '%')
        or (p.display_name ilike '%' || search_query || '%')
    order by s.created_at desc
    limit 50;
end;
$$;

-- 2. "Flagged Terms" Auto-Scanner
drop function if exists public.admin_scan_violations();
create or replace function public.admin_scan_violations()
returns table (
    set_id uuid,
    title text,
    creator_email text,
    creator_name text,
    flagged_term text,
    context text,
    created_at timestamptz
)
language plpgsql
security definer
as $$
declare
    bad_terms text[] := array['cheat', 'hack', 'dump', 'answers', 'exam', 'discord']; 
begin
    -- Admin Check
    if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
        raise exception 'Access Denied';
    end if;

    -- We loop through terms (inefficient for huge DBs, but fine for V1)
    return query
    select distinct
        s.id as set_id,
        s.title,
        u.email::text as creator_email,
        p.display_name as creator_name,
        -- Find the first matched term
        coalesce(
            (select t from unnest(bad_terms) t where s.title ~* t limit 1),
            (select t from unnest(bad_terms) t where s.description ~* t limit 1),
            'suspicious'
        )::text as flagged_term,
        -- Context explaining exactly what was matched
        case 
            when s.title ~* 'cheat' then 'Flagged: "cheat" in Title'
            when s.title ~* 'hack' then 'Flagged: "hack" in Title'
            when s.title ~* 'dump' then 'Flagged: "dump" in Title'
            when s.title ~* 'answers' then 'Flagged: "answers" in Title'
            when s.title ~* 'exam' then 'Flagged: "exam" in Title'
            when s.title ~* 'discord' then 'Flagged: "discord" in Title'
            when s.description ~* 'cheat' then 'Flagged: "cheat" in Description'
            when s.description ~* 'hack' then 'Flagged: "hack" in Description'
            when s.description ~* 'dump' then 'Flagged: "dump" in Description'
            when s.description ~* 'answers' then 'Flagged: "answers" in Description'
            when s.description ~* 'exam' then 'Flagged: "exam" in Description'
            when s.description ~* 'discord' then 'Flagged: "discord" in Description'
            else 'Flagged Content Found'
        end::text as context,
        s.created_at
    from public.study_sets s
    join auth.users u on s.user_id = u.id
    join public.profiles p on s.user_id = p.id
    where 
        s.title ~* 'cheat|hack|dump|exam|discord'
        or s.description ~* 'cheat|hack|dump|exam|discord'
    order by s.created_at desc
    limit 20;
end;
$$;

-- 3. Secure Force Delete (Bypasses generic RLS if needed, strictly Admin only)
create or replace function public.admin_delete_content(target_set_id uuid)
returns void
language plpgsql
security definer
as $$
begin
    -- Admin Check
    if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
        raise exception 'Access Denied';
    end if;

    -- Delete (Cascade will handle cards usually, but let's be safe)
    delete from public.study_sets where id = target_set_id;
end;
$$;
