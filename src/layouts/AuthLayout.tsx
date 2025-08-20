import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSessionAndProfile = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError);
        navigate('/login');
        return;
      }

      if (!session) {
        navigate('/login');
      } else {
        // Fetch user profile to check tutorial status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('has_completed_tutorial')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for new profiles
          console.error("Error fetching profile:", profileError);
          // Decide how to handle this error, perhaps still allow access or show an error page
          setLoading(false);
          return;
        }

        if (!profile || profile.has_completed_tutorial === false) {
          // If profile doesn't exist or tutorial not completed, redirect to welcome
          navigate('/welcome');
        } else {
          // User is authenticated and tutorial completed, show app content
          setLoading(false);
        }
      }
    };

    checkSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
      } else {
        // Re-check profile on auth state change (e.g., after sign-up)
        checkSessionAndProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthLayout;