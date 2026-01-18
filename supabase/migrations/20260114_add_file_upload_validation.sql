-- Server-side validation for premium file uploads
-- Prevents bypassing client-side checks for PPTX, DOCX, images, and large files

CREATE OR REPLACE FUNCTION public.validate_file_upload(
    p_user_id UUID,
    p_file_type TEXT,
    p_file_size BIGINT
)
RETURNS JSON AS $$
DECLARE
    v_is_premium BOOLEAN;
    v_is_admin BOOLEAN;
    v_max_size BIGINT;
    v_is_premium_type BOOLEAN;
BEGIN
    -- Check admin status (admins get all premium features)
    SELECT COALESCE(is_admin, false) INTO v_is_admin
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Check subscription status for non-admins
    IF v_is_admin THEN
        v_is_premium := true;
    ELSE
        SELECT EXISTS(
            SELECT 1 FROM public.subscriptions 
            WHERE user_id = p_user_id 
            AND status IN ('active', 'trialing')
        ) INTO v_is_premium;
    END IF;
    
    -- Check if file type requires premium
    v_is_premium_type := (
        p_file_type ILIKE '%.pptx' OR 
        p_file_type ILIKE '%.docx' OR 
        p_file_type LIKE 'image/%' OR
        p_file_type ILIKE 'application/vnd.openxmlformats-officedocument.presentationml.presentation' OR
        p_file_type ILIKE 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    
    -- Validate premium file types
    IF v_is_premium_type AND NOT v_is_premium THEN
        RETURN json_build_object(
            'allowed', false,
            'error', 'Premium feature. PowerPoint, Word, and Image uploads require Pro. Upgrade to unlock.',
            'reason', 'premium_file_type'
        );
    END IF;
    
    -- Validate file size (10MB free, 45MB premium)
    v_max_size := CASE WHEN v_is_premium THEN 47185920 ELSE 10485760 END;
    
    IF p_file_size > v_max_size THEN
        RETURN json_build_object(
            'allowed', false,
            'error', format('File too large. Limit: %sMB. %s', 
                v_max_size / 1048576,
                CASE WHEN NOT v_is_premium THEN 'Upgrade to Pro for 45MB uploads.' ELSE '' END
            ),
            'reason', 'file_size_limit',
            'max_size', v_max_size,
            'current_size', p_file_size
        );
    END IF;
    
    -- All checks passed
    RETURN json_build_object(
        'allowed', true,
        'is_premium', v_is_premium,
        'max_size', v_max_size
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_file_upload(UUID, TEXT, BIGINT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.validate_file_upload IS 'Server-side validation for file uploads. Checks subscription status and enforces premium file type and size limits.';
