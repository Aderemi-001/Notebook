import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/LoadingScreen';

interface AgreementGuardProps {
    children: React.ReactNode;
}

/**
 * AgreementGuard
 * 
 * Protects routes by ensuring the user has accepted the Terms and Conditions.
 * If not accepted, redirects to /user-agreement.
 * Allow bypassing for specific public/auth routes if needed, 
 * but generally this wraps the main dashboard/app area.
 */
const AgreementGuard: React.FC<AgreementGuardProps> = ({ children }) => {
    const { user, profile, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (!loading) {
            if (user) {
                // If user is logged in, check if they have accepted terms
                // We use the profile data which should now contain terms_accepted_at
                if (profile && !profile.terms_accepted_at) {
                    // Redirect to agreement page if not accepted
                    // Prevent infinite loop if already there (though this guard usually wraps other routes)
                    if (location.pathname !== '/user-agreement') {
                        navigate('/user-agreement', { replace: true });
                    }
                }
            }
            setIsChecking(false);
        }
    }, [user, profile, loading, navigate, location]);

    if (loading || isChecking) {
        return <LoadingScreen />;
    }

    return <>{children}</>;
};

export default AgreementGuard;
