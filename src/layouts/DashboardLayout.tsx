
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Search,
    Brain,
    Settings,
    FileText,
    NotebookPen,
    User,
    Globe,
    Library,
    GraduationCap,
    CreditCard,
    ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { useRealtime } from '@/hooks/useRealtime';
import { useIsMobile } from '@/hooks/use-mobile';
import WebDashboardLayout from './WebDashboardLayout';
import MobileDashboardLayout from './MobileDashboardLayout';
import Chatbot from '@/components/Chatbot';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

interface BroadcastData {
    message: string;
    active: boolean;
    type: 'info' | 'warning' | 'alert';
    isPopup?: boolean;
    expiresAt?: string | null;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const isMobile = useIsMobile();
    const [showNovaPulse, setShowNovaPulse] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, profile, loading: authLoading } = useAuth();

    // Broadcast & Maintenance State
    const [broadcast, setBroadcast] = useState<BroadcastData | null>(null);
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [maintenance, setMaintenance] = useState(false);

    // Fetch System Settings
    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('system_settings')
                .select('*')
                .in('key', ['global_broadcast', 'maintenance_mode']);

            if (data) {
                const broadcastValue = data.find(d => d.key === 'global_broadcast')?.value;
                const broadcastData = broadcastValue && typeof broadcastValue === 'object' && !Array.isArray(broadcastValue) 
                    ? broadcastValue as unknown as BroadcastData 
                    : null;
                const maintenanceData = data.find(d => d.key === 'maintenance_mode')?.value;

                // Check broadcast validity
                if (broadcastData?.active) {
                    const now = new Date();
                    const isExpired = broadcastData.expiresAt && new Date(broadcastData.expiresAt) < now;
                    const dismissKey = `dismissed_broadcast_${broadcastData.message.substring(0, 20)}`;
                    const isDismissed = localStorage.getItem(dismissKey);

                    if (!isExpired && !isDismissed) {
                        setBroadcast(broadcastData);
                        if (broadcastData.isPopup) {
                            setIsBroadcastOpen(true);
                        }
                    } else {
                        setBroadcast(null);
                    }
                } else {
                    setBroadcast(null);
                }

                if (maintenanceData && typeof maintenanceData === 'object' && 'active' in maintenanceData && (maintenanceData as any).active) {
                    setMaintenance(true);
                } else {
                    setMaintenance(false);
                }
            }
        };
        fetchSettings();
    }, [location.pathname]);

    // Listen for Nova Redirects
    useEffect(() => {
        const handleRedirect = () => {
            setShowNovaPulse(true);
            setTimeout(() => setShowNovaPulse(false), 3000);
        };

        window.addEventListener('novaRedirect', handleRedirect);
        return () => window.removeEventListener('novaRedirect', handleRedirect);
    }, []);

    // Enable Real-time updates
    useRealtime();

    // Check for terms acceptance
    useEffect(() => {
        if (!user) return;

        const allowedPaths = ['/user-agreement', '/terms', '/logout', '/login', '/privacy', '/contact', '/about'];
        if (allowedPaths.includes(location.pathname)) return;

        const checkAgreement = async () => {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('terms_accepted_at')
                .eq('id', user.id)
                .single();

            if (!error && profile && !profile.terms_accepted_at) {
                navigate('/user-agreement');
            }
        };

        checkAgreement();
    }, [user, location.pathname, navigate]);

    // Check for unread notifications
    // NOTE: Auto-toast disabled in V3.0 in favor of Notification Inbox
    // Only real-time broadcasts or specific urgent alerts might trigger toasts elsewhere


    // Check for subscription expiry notification
    const { status: subStatus } = useSubscription(); // Need to import useSubscription
    useEffect(() => {
        if (subStatus === 'expired') {
            const hasNotified = localStorage.getItem('expiry_notified_v3.0');
            if (!hasNotified) {
                showSuccess("Your subscription has ended. Renew now to continue enjoying Pro features.");
                localStorage.setItem('expiry_notified_v3.0', 'true');
            }
        } else {
            // Reset if they become active/trialing again so they get notified next time they expire
            if (subStatus === 'active' || subStatus === 'trialing') {
                localStorage.removeItem('expiry_notified_v3.0');
            }
        }
    }, [subStatus]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        showSuccess('Logged out successfully');
        navigate('/login');
    };

    // Maintenance Mode Overlay (EXEMPT ADMINS)
    if (maintenance && !authLoading && !profile?.is_admin) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background space-y-4">
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                    <ShieldAlert className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold">System Maintenance</h1>
                <p className="text-muted-foreground text-center max-w-md px-4">
                    We are currently performing scheduled maintenance. The application is temporarily unavailable. Please check back soon.
                </p>
                <div className="pt-6">
                    <button
                        onClick={handleLogout}
                        className="text-sm text-red-500 hover:text-red-700 font-medium underline underline-offset-4"
                    >
                        Sign Out / Switch Account
                    </button>
                </div>
            </div>
        );
    }

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { label: 'My Notes', icon: NotebookPen, path: '/notebook' },
        { label: 'My Sets', icon: Library, path: '/sets' },
        { label: 'Explore Sets', icon: Globe, path: '/explore-public-sets' },
        { label: 'Practice Quiz', icon: GraduationCap, path: '/exams' },
        { label: 'Textbook Finder', icon: Search, path: '/textbook-finder' },
        { label: 'Constellation (Beta)', icon: Brain, path: '/constellation' },
        { label: 'Essay Practice', icon: FileText, path: '/essays' },
        { label: 'Upgrade to Pro', icon: CreditCard, path: '/pricing' },
    ];

    const bottomNavItems = [
        { label: 'Profile', icon: User, path: '/profile' },
        { label: 'Settings', icon: Settings, path: '/settings' },
    ];

    const handleAuthCheck = (e: React.MouseEvent, path: string) => {
        if (!user) {
            e.preventDefault();
            navigate('/login', { state: { from: path } });
        }
    };

    const sharedProps = {
        user,
        profile,
        maintenance,
        broadcast,
        setBroadcast,
        isBroadcastOpen,
        setIsBroadcastOpen,
        navItems,
        bottomNavItems,
        handleLogout,
        handleAuthCheck,
    };

    return (
        <>
            {/* Maintenance Banner for Admins */}
            {maintenance && profile?.is_admin && (
                <div className="bg-red-600 text-white px-4 py-1.5 text-[10px] font-black text-center uppercase tracking-[0.2em] fixed top-0 w-full z-[100] animate-pulse">
                    ⚠️ System Maintenance Mode Active - platform locked for non-admins
                </div>
            )}

            {isMobile ? (
                <MobileDashboardLayout {...sharedProps}>
                    {children}
                </MobileDashboardLayout>
            ) : (
                <WebDashboardLayout {...sharedProps}>
                    {children}
                </WebDashboardLayout>
            )}

            <Chatbot />
            <InstallPrompt />

            {/* Global Nova Redirect Effect */}
            {showNovaPulse && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-3xl animate-in fade-in duration-300 overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent -skew-x-12 animate-shimmer-wave" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center justify-center font-heading text-center">
                        <div className="p-[1px] rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-2xl shadow-purple-500/20">
                            <div className="w-24 h-24 bg-black/40 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white">
                                <Search className="w-12 h-12 animate-pulse" />
                            </div>
                        </div>
                        <span className="mt-8 text-3xl font-black tracking-widest uppercase bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse px-4">
                            Nova
                        </span>
                    </div>
                </div>
            )}
        </>
    );
};

export default DashboardLayout;
