
import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Sparkles, ShieldAlert, Megaphone as AnnouncementIcon, X, LogOut, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import BrandLogo from '@/components/BrandLogo';
import { AdminBadge } from '@/components/AdminBadge';
import MobileBottomNav from '@/components/mobile/MobileBottomNav';
import { Footer } from '@/components/Footer';
import { NotificationsSheet } from '@/components/dashboard/NotificationsSheet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from '@/contexts/LanguageContext';

interface MobileDashboardLayoutProps {
    children: React.ReactNode;
    user: any;
    profile: any;
    broadcast: any;
    isBroadcastOpen: boolean;
    setIsBroadcastOpen: (o: boolean) => void;
    navItems: any[];
    bottomNavItems: any[];
    handleLogout: () => void;
    handleAuthCheck: (e: React.MouseEvent, path: string) => void;
    onDismissBroadcast: () => void;
}

const MobileDashboardLayout: React.FC<MobileDashboardLayoutProps> = ({
    children, user, profile, broadcast,
    isBroadcastOpen, setIsBroadcastOpen, navItems, bottomNavItems,
    handleLogout, handleAuthCheck, onDismissBroadcast
}) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useLanguage();

    // Helper to translate nav items dynamically
    const translateLabel = (label: string) => {
        const lowerLabel = label.toLowerCase();
        // Map common labels to translation keys
        const map: { [key: string]: string } = {
            'dashboard': 'sidebar.dashboard',
            'my library': 'sidebar.library',
            'community': 'sidebar.community',
            'achievements': 'sidebar.achievements',
            'assignments': 'sidebar.assignments',
            'settings': 'sidebar.settings',
            'profile': 'sidebar.profile'
        };

        const key = map[lowerLabel];
        return key ? t(key) : label;
    };

    // Scroll to top on route change
    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary pb-20">
            {/* Mobile Header */}
            <header className="flex items-center justify-between p-4 border-b bg-background/60 backdrop-blur-xl sticky top-0 z-50">
                <Link to="/" className="flex items-center gap-2 active:scale-95 transition-transform">
                    <BrandLogo size="sm" rounded="2xl" shadow />
                    <span className="font-black text-xl tracking-tight">Notebook</span>
                    {profile?.is_admin && <AdminBadge className="text-[10px] px-1.5 h-4.5 ml-1 bg-indigo-500 text-white border-0" />}
                </Link>

                {!user ? (
                    <Button asChild size="sm" variant="ghost" className="text-primary font-bold hover:bg-primary/10 rounded-xl">
                        <Link to="/login">{t('sidebar.login')}</Link>
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <NotificationsSheet
                            open={isNotificationOpen}
                            onOpenChange={setIsNotificationOpen}
                        />
                        <Button variant="ghost" size="icon" className="rounded-full overflow-hidden border border-border/40" asChild>
                            <Link to="/profile">
                                <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="Profile" className="w-full h-full object-cover" />
                            </Link>
                        </Button>
                    </div>
                )}
            </header>

            {/* Broadcast Banner */}
            {broadcast && !broadcast.isPopup && (
                <div className={`relative z-[60] px-4 py-3 flex items-start justify-between text-xs font-bold animate-in slide-in-from-top duration-500 shadow-md mb-2
                    ${broadcast.type === 'alert' ? 'bg-red-600 text-white' :
                        broadcast.type === 'warning' ? 'bg-amber-500 text-white' :
                            'bg-indigo-600 text-white'}`}>
                    <div className="flex-1 tracking-tight pr-4">
                        {broadcast.message}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-white hover:bg-white/20 shrink-0"
                        onClick={onDismissBroadcast}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-grow flex flex-col p-4 overflow-x-hidden animate-fade-in bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.05),transparent_60%)]">
                <div className="max-w-7xl mx-auto flex-grow w-full flex flex-col">
                    <div className="flex-grow min-h-screen">
                        {children}
                    </div>
                    <Footer className="mt-auto border-t-0 bg-transparent px-0 pb-24 pt-4" />
                </div>
            </main>

            {/* Floating Mobile Bottom Navigation */}
            <MobileBottomNav
                onMenuClick={() => setMobileMenuOpen(true)}
                onAuthCheck={handleAuthCheck}
            />

            {/* Menu Drawer */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} modal={false}>
                <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-[3rem] border-primary/20 bg-background/95 backdrop-blur-xl">
                    <SheetHeader className="pb-6">
                        <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mb-4" />
                        <SheetTitle className="text-2xl font-black tracking-tight text-center">Nova Hub</SheetTitle>
                    </SheetHeader>

                    <div className="grid grid-cols-2 gap-3 p-2 pb-32">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={(e) => {
                                    handleAuthCheck(e, item.path);
                                    setMobileMenuOpen(false);
                                }}
                                className={cn(
                                    "flex flex-col items-center justify-center p-6 rounded-3xl transition-all border border-border/40 bg-card/50",
                                    location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
                                        ? 'bg-primary/10 text-primary border-primary/30 font-bold shadow-[0_0_20px_rgba(79,70,229,0.05)]'
                                        : 'hover:bg-muted text-muted-foreground'
                                )}
                            >
                                <item.icon className={cn("h-6 w-6 mb-3", (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))) ? "text-primary" : "opacity-60")} />
                                <span className="text-sm text-center font-bold tracking-tight">{translateLabel(item.label)}</span>
                            </Link>
                        ))}

                        {/* Admin Link for Mobile */}
                        {profile?.is_admin && (
                            <Link
                                to="/admin"
                                onClick={(e) => {
                                    handleAuthCheck(e, '/admin');
                                    setMobileMenuOpen(false);
                                }}
                                className={cn(
                                    "col-span-2 flex items-center gap-3 p-4 rounded-2xl transition-all border border-indigo-500/20 bg-indigo-500/5 mb-2",
                                    location.pathname.startsWith('/admin')
                                        ? 'text-indigo-600 font-bold border-indigo-500/40 shadow-[0_0_15px_rgba(79,70,229,0.1)]'
                                        : 'hover:bg-indigo-500/10 text-indigo-600/80'
                                )}
                            >
                                <ShieldAlert className="h-5 w-5" />
                                <span className="text-sm font-bold">Control Center</span>
                            </Link>
                        )}

                        <div className="col-span-2 border-t border-border/40 mt-6 pt-6 grid grid-cols-2 gap-3">
                            {bottomNavItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={(e) => {
                                        handleAuthCheck(e, item.path);
                                        setMobileMenuOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 p-4 rounded-2xl transition-all border border-border/20",
                                        location.pathname === item.path
                                            ? 'bg-primary/10 text-primary font-bold'
                                            : 'hover:bg-muted text-muted-foreground'
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span className="text-sm font-bold">{translateLabel(item.label)}</span>
                                </Link>
                            ))}
                            <Button
                                variant="ghost"
                                className="col-span-2 justify-start h-14 rounded-2xl text-red-500 hover:bg-red-500/10 hover:text-red-600 font-black mt-2"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    user ? handleLogout() : navigate('/login');
                                }}
                            >
                                {user ? <LogOut className="mr-3 h-5 w-5" /> : <LogIn className="mr-3 h-5 w-5" />}
                                {user ? t('sidebar.logout') : t('sidebar.login')}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Reusable Dialogs for Broadcasts */}
            <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
                <DialogContent className="w-[90vw] max-w-[400px] rounded-[2.5rem] border-primary/20 shadow-2xl glass-card">
                    <DialogHeader>
                        <DialogTitle className={cn(
                            "flex items-center gap-3 text-xl font-black",
                            broadcast?.type === 'alert' ? "text-red-500" :
                                broadcast?.type === 'warning' ? "text-amber-500" :
                                    "text-indigo-500"
                        )}>
                            <div className="p-2 rounded-xl bg-current/10">
                                {broadcast?.type === 'alert' ? <ShieldAlert className="h-6 w-6" /> :
                                    broadcast?.type === 'warning' ? <Sparkles className="h-6 w-6" /> :
                                        <AnnouncementIcon className="h-6 w-6" />}
                            </div>
                            Announcement
                        </DialogTitle>
                        <DialogDescription className="pt-4 text-base text-foreground font-semibold leading-relaxed">
                            {broadcast?.message}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={onDismissBroadcast}
                            className="rounded-xl px-8 font-bold"
                        >
                            {t('common.dismiss')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MobileDashboardLayout;
