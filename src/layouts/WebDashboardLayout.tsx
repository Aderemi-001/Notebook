
import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    LogIn,
    Plus,
    ShieldAlert,
    Sparkles,
    Megaphone as AnnouncementIcon,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/BrandLogo';
import { AdminBadge } from '@/components/AdminBadge';
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

interface WebDashboardLayoutProps {
    children: React.ReactNode;
    user: any;
    profile: any;
    broadcast: any;
    setBroadcast: (b: any) => void;
    isBroadcastOpen: boolean;
    setIsBroadcastOpen: (o: boolean) => void;
    navItems: any[];
    bottomNavItems: any[];
    handleLogout: () => void;
    handleAuthCheck: (e: React.MouseEvent, path: string) => void;
}

const WebDashboardLayout: React.FC<WebDashboardLayoutProps> = ({
    children, user, profile, broadcast, setBroadcast,
    isBroadcastOpen, setIsBroadcastOpen, navItems, bottomNavItems,
    handleLogout, handleAuthCheck
}) => {
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


    const NavItem = ({ item }: { item: any }) => {
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

        return (
            <Link
                to={item.path}
                className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                    isActive
                        ? "bg-primary/10 text-primary font-bold shadow-[inset_0_0_20px_rgba(79,70,229,0.05)]"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:translate-x-1"
                )}
                onClick={(e) => handleAuthCheck(e, item.path)}
            >
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-glow" />
                )}
                <item.icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                <span className="relative z-10">{translateLabel(item.label)}</span>
            </Link>
        );
    };

    const mainRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        // Scroll main content area to top on route change
        if (mainRef.current) {
            mainRef.current.scrollTo(0, 0);
        }
        window.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-background flex selection:bg-primary/20 selection:text-primary">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-72 shrink-0 border-r bg-card/40 backdrop-blur-xl sticky top-0 h-screen p-6 overflow-y-auto custom-scrollbar transition-all duration-500">
                <div className="mb-10">
                    <Link to="/" className="flex flex-wrap items-center gap-3 font-heading font-black text-2xl px-2 text-primary hover:opacity-80 transition-all active:scale-95">
                        <BrandLogo size="md" rounded="2xl" shadow />
                        <span className="tracking-tighter">Notebook</span>
                        {profile?.is_admin && <AdminBadge className="ml-1 shrink-0 bg-indigo-500 text-white border-0" />}
                    </Link>
                </div>

                <div className="relative mb-10 group">
                    <div className="flex justify-end mb-2">
                        <span className="bg-nova-gradient text-white text-[9px] px-2.5 py-1 rounded-full font-black shadow-glow animate-nova-gradient tracking-widest uppercase border border-white/20">
                            {t('sidebar.supernova')}
                        </span>
                    </div>
                    <Button asChild className="w-full shadow-premium hover:shadow-premium-hover rounded-[1.25rem] py-8 text-lg font-black tracking-tight transition-all active:scale-95 group overflow-hidden bg-primary hover:bg-primary/90 active:bg-primary border-0 select-none touch-none" size="lg">
                        <Link to="/create" onClick={(e) => handleAuthCheck(e, '/create')} className="focus:outline-none">
                            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Plus className="mr-3 h-6 w-6 transition-transform group-hover:rotate-180 duration-500" />
                            {t('sidebar.createSet')}
                        </Link>
                    </Button>
                </div>

                <div className="flex-col flex gap-1.5 hover-layer">
                    <p className="text-[10px] font-black text-muted-foreground px-4 mb-3 uppercase tracking-[0.2em] opacity-60">{t('sidebar.learningContext')}</p>
                    {navItems.map(item => <NavItem key={item.path} item={item} />)}
                </div>

                <div className="flex-grow min-h-[4rem]" />

                <div className="flex flex-col gap-1.5 border-t border-border/40 pt-8 mt-8">
                    {profile?.is_admin && (
                        <div className="mb-4 pb-4 border-b border-border/40">
                            <p className="text-[10px] font-black text-indigo-500 px-4 mb-3 uppercase tracking-[0.2em]">{t('sidebar.management')}</p>
                            <Link
                                to="/admin"
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative group overflow-hidden",
                                    location.pathname.startsWith('/admin')
                                        ? "bg-indigo-500/10 text-indigo-600 font-bold shadow-[inset_0_0_20px_rgba(79,70,229,0.05)]"
                                        : "text-muted-foreground hover:bg-secondary hover:text-indigo-600 hover:translate-x-1"
                                )}
                            >
                                {location.pathname.startsWith('/admin') && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-glow" />
                                )}
                                <LayoutDashboard className="h-5 w-5 transition-transform group-hover:scale-110" />
                                <span>{t('sidebar.admin')}</span>
                            </Link>
                        </div>
                    )}
                    <div className="px-4 mb-4">
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-card/50 border border-border/40">
                            <span className="text-sm font-bold text-muted-foreground">Inbox</span>
                            <NotificationsSheet />
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground px-4 mb-3 uppercase tracking-[0.2em] opacity-60">{t('sidebar.preferences')}</p>
                    {bottomNavItems.map(item => <NavItem key={item.path} item={item} />)}

                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start mt-4 rounded-2xl h-12 font-bold px-4 transition-all duration-300",
                            user ? "text-muted-foreground hover:text-red-500 hover:bg-red-500/10" : "text-primary hover:text-primary/90 hover:bg-primary/10"
                        )}
                        onClick={user ? handleLogout : () => navigate('/login')}
                    >
                        {user ? (
                            <>
                                <LogOut className="mr-3 h-5 w-5 opacity-60 group-hover:opacity-100" /> {t('sidebar.logout')}
                            </>
                        ) : (
                            <>
                                <LogIn className="mr-3 h-5 w-5 opacity-60 group-hover:opacity-100" /> {t('sidebar.login')}
                            </>
                        )}
                    </Button>
                </div>


                {/* Footer Attribution - Supernova Style */}
                <div className="mt-10 p-5 glass-card relative group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-nova-gradient opacity-40" />
                    <p className="text-[9px] text-muted-foreground uppercase tracking-[0.25em] font-black mb-4 flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-indigo-500" /> {t('sidebar.aiStatus')}
                    </p>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-foreground/70">{t('sidebar.neuralEngine')}</span>
                            <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-glow" />
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-glow" />
                                <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-glow" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-foreground/70">{t('sidebar.syncLatency')}</span>
                            <span className="text-[10px] font-black text-emerald-500">12ms</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Broadcast Banner (Desktop Wide) */}
                {broadcast && !broadcast.isPopup && (
                    <div className={`relative z-[60] px-6 py-3 flex items-center justify-between text-sm font-bold animate-in slide-in-from-top duration-500 shadow-lg
                        ${broadcast.type === 'alert' ? 'bg-red-600 text-white' :
                            broadcast.type === 'warning' ? 'bg-amber-500 text-white' :
                                'bg-indigo-600 text-white'}`}>
                        <div className="flex-1 text-center font-black uppercase tracking-widest">
                            {broadcast.message}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-white hover:bg-white/20 shrink-0 transition-transform active:scale-90"
                            onClick={() => {
                                const dismissKey = `dismissed_broadcast_${broadcast.message.substring(0, 20)}`;
                                localStorage.setItem(dismissKey, 'true');
                                setBroadcast(null);
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                <main ref={mainRef} className="flex-grow flex flex-col overflow-y-auto animate-fade-in bg-[radial-gradient(ellipse_at_top_right,rgba(79,70,229,0.03),transparent_50%)]">
                    <div className="flex-grow w-full min-h-screen">
                        {children}
                    </div>
                    <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full mt-auto">
                        <Footer className="mt-4 border-t-0 bg-transparent px-0" />
                    </div>
                </main>
            </div>



            {/* Broadcast Pop-up Modal */}
            <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] border-primary/20 shadow-2xl overflow-hidden glass-card">
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
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
                        <DialogDescription className="pt-6 text-lg text-foreground font-semibold leading-relaxed whitespace-pre-wrap">
                            {broadcast?.message}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={() => {
                                const dismissKey = `dismissed_broadcast_${broadcast?.message.substring(0, 20)}`;
                                localStorage.setItem(dismissKey, 'true');
                                setIsBroadcastOpen(false);
                                setBroadcast(null);
                            }}
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

export default WebDashboardLayout;
