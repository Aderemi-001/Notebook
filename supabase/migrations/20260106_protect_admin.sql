-- Create a function to check if is_admin is being changed
CREATE OR REPLACE FUNCTION public.prevent_admin_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the is_admin column is being modified
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        -- Allow if it's a superuser or service_role (reserved for internal admin tools if needed)
        -- But for standard API 'authenticated' users, BLOCK IT.
        IF auth.role() = 'authenticated' THEN
            RAISE EXCEPTION 'You are not authorized to change administrative privileges.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on profiles
DROP TRIGGER IF EXISTS protect_admin_column ON public.profiles;

CREATE TRIGGER protect_admin_column
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_escalation();
