-- Secure RPC: Search All Sets (Admin Only)
CREATE OR REPLACE FUNCTION public.admin_search_sets(search_query TEXT)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    is_public BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    creator_name TEXT,
    creator_email TEXT,
    card_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    RETURN QUERY
    SELECT 
        ss.id,
        ss.title,
        ss.description,
        ss.is_public,
        ss.created_at,
        p.display_name,
        au.email::TEXT,
        (SELECT COUNT(*) FROM public.flashcards fc WHERE fc.study_set_id = ss.id) as card_count
    FROM public.study_sets ss
    JOIN public.profiles p ON ss.user_id = p.id
    JOIN auth.users au ON p.id = au.id
    WHERE 
        ss.title ILIKE '%' || search_query || '%' OR
        ss.description ILIKE '%' || search_query || '%' OR
        p.display_name ILIKE '%' || search_query || '%'
    ORDER BY ss.created_at DESC
    LIMIT 50;
END;
$$;

-- Secure RPC: Force Delete Set (Admin Only)
CREATE OR REPLACE FUNCTION public.admin_delete_set(target_set_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    DELETE FROM public.study_sets WHERE id = target_set_id;

    -- Log it
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (auth.uid(), 'DELETE_SET', target_set_id, jsonb_build_object('set_id', target_set_id));
END;
$$;
