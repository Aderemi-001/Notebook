
import React, { useState, useEffect } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom'; // keeping removed imports commented out or just removing them
import {
    LayoutDashboard,
    Search,
    Settings,
    FileText,
    NotebookPen,
    User,
    Globe,
    Library,
    GraduationCap,
    CreditCard,
    ShieldAlert,
    Timer,
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
    }, []);

    // Enable Real-time updates
    useRealtime();

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
        // navigate('/login'); // Removed navigate
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
        { label: 'Public Study Sets', icon: Globe, path: '/explore-public-sets' },
        { label: 'Practice Quiz', icon: GraduationCap, path: '/exams' },
        { label: 'Essays', icon: FileText, path: '/essays' },
        { label: 'Textbook Finder', icon: Search, path: '/textbook-finder' },
        { label: 'Focus Timer', icon: Timer, path: '/focus-timer' },
        { label: 'Upgrade to Pro', icon: CreditCard, path: '/pricing' },
    ];

    const bottomNavItems = [
        { label: 'Profile', icon: User, path: '/profile' },
        { label: 'Settings', icon: Settings, path: '/settings' },
    ];

    const handleAuthCheck = (e: React.MouseEvent, _path: string) => {
        if (!user) {
            e.preventDefault();
            // navigate('/login', { state: { from: path } }); // Removed navigate
        }
    };

    const handleDismissBroadcast = () => {
        if (!broadcast) return;
        const safeMessage = broadcast.message || '';
        const dismissKey = `dismissed_broadcast_${safeMessage.substring(0, 20)}`;
        localStorage.setItem(dismissKey, 'true');
        setBroadcast(null);
        setIsBroadcastOpen(false);
    };

    const sharedProps = {
        user,
        profile,
        maintenance,
        broadcast,
        isBroadcastOpen,
        setIsBroadcastOpen,
        onDismissBroadcast: handleDismissBroadcast,
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
        </>
    );
};

export default DashboardLayout;
