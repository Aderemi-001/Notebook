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
 * Users only need to accept once. Manual intervention required for future updates.
 */
const AgreementGuard: React.FC<AgreementGuardProps> = ({ children }) => {
    const { user, profile, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Wait for auth to finish loading
        if (!loading) {
            if (user) {
                // CRITICAL: Wait for profile to be loaded before checking
                // If user exists but profile is null, we're still loading
                if (profile === null) {
                    console.log('AgreementGuard: Waiting for profile to load...');
                    setIsChecking(true); // Keep checking state active
                    return; // Don't proceed until profile is loaded
                }

                // Simply check if user has accepted terms at any point
                const hasAccepted = profile && profile.terms_accepted_at;

                console.log('AgreementGuard check:', {
                    hasProfile: !!profile,
                    termsAcceptedAt: profile?.terms_accepted_at,
                    hasAccepted,
                    currentPath: location.pathname
                });

                if (!hasAccepted) {
                    // Redirect to agreement page if never accepted
                    if (location.pathname !== '/user-agreement') {
                        console.log('Redirecting to user agreement page');
                        navigate('/user-agreement', { replace: true });
                    }
                } else {
                    // User has accepted, allow them to leave agreement page
                    console.log('User has accepted terms, allowing navigation');
                }

                setIsChecking(false); // Only set to false when profile is loaded
            } else {
                // No user, stop checking
                setIsChecking(false);
            }
        }
    }, [user, profile, loading, navigate, location]);

    if (loading || isChecking) {
        return <LoadingScreen />;
    }

    return <>{children}</>;
};

export default AgreementGuard;
