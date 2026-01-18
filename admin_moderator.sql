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
create or replace function public.admin_scan_violations()
returns table (
    set_id uuid,
    title text,
    creator_email text,
    flagged_term text,
    context text,
    created_at timestamptz
)
language plpgsql
security definer
as $$
declare
    -- Define bad words logic here (or use a table in future)
    -- For now, hardcoded list of "sketchy" terms often used in abuse
    bad_terms text[] := array['cheat', 'hack', 'dump', 'answers', 'exam', 'discord']; 
    term text;
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
        'suspicious_keyword' as flagged_term,
        case 
            when s.title ilike '%cheat%' then 'In Title: ...' || s.title
            when s.description ilike '%cheat%' then 'In Desc: ...' || substring(s.description from 1 for 50)
            else 'Matched keyword scan'
        end as context,
        s.created_at
    from public.study_sets s
    join auth.users u on s.user_id = u.id
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
