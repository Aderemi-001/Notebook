-- Fix for Admin Content Search (Type Mismatch 42804)
-- 1. DROP the existing function
DROP FUNCTION IF EXISTS public.admin_search_content(text);

-- 2. Re-create with type casting to match "text" return type
CREATE OR REPLACE FUNCTION public.admin_search_content(search_query text)
 RETURNS TABLE(
    id uuid,
    title text,
    description text,
    is_public boolean,
    created_at timestamp with time zone,
    creator_name text,
    creator_email text,
    card_count bigint
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.description,
    s.is_public,
    s.created_at,
    p.display_name::text as creator_name, -- CAST to text to match return type
    au.email::text as creator_email,      -- CAST to text (fixes varchar mismatch)
    (SELECT count(*) FROM cards c WHERE c.set_id = s.id) as card_count
  FROM study_sets s
  LEFT JOIN profiles p ON s.user_id = p.id
  LEFT JOIN auth.users au ON s.user_id = au.id
  WHERE 
    s.title ILIKE '%' || search_query || '%' OR
    s.description ILIKE '%' || search_query || '%' OR
    p.display_name ILIKE '%' || search_query || '%' OR
    au.email ILIKE '%' || search_query || '%'
  ORDER BY s.created_at DESC
  LIMIT 50;
END;
$function$;
