import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    LogIn,
    Plus,
    ShieldAlert,
    Sparkles,
    Megaphone as AnnouncementIcon,
    X,
    Menu, // Import Menu icon
    NotebookPen,
    Library
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'; // Import Sheet Components
import { useLanguage } from '@/contexts/LanguageContext';


interface WebDashboardLayoutProps {
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

const WebDashboardLayout: React.FC<WebDashboardLayoutProps> = ({
    children, user, profile, broadcast,
    isBroadcastOpen, setIsBroadcastOpen, navItems, bottomNavItems,
    handleLogout, handleAuthCheck, onDismissBroadcast
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useLanguage();

    // State for the "More" menu sheet (same as mobile)
    const [menuOpen, setMenuOpen] = useState(false);

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

    const mainRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary pb-24">
            {/* Desktop Header (Unified with Mobile Style) */}
            <header className="flex items-center justify-between px-6 py-4 border-b bg-background/60 backdrop-blur-xl sticky top-0 z-[40]">
                <Link to="/" className="flex items-center gap-3 active:scale-95 transition-transform">
                    <BrandLogo size="md" rounded="2xl" shadow />
                    <span className="font-heading font-black text-2xl tracking-tighter">Notebook</span>
                    {profile?.is_admin && <AdminBadge className="ml-1 shrink-0 bg-indigo-500 text-white border-0" />}
                </Link>

                <div className="flex items-center gap-4">
                    {!user ? (
                        <Button asChild variant="ghost" className="text-primary font-bold hover:bg-primary/10 rounded-xl">
                            <Link to="/login">{t('sidebar.login')}</Link>
                        </Button>
                    ) : (
                        <>
                            <NotificationsSheet />
                            <Link to="/profile">
                                <div className="h-10 w-10 rounded-full overflow-hidden border border-border/40 hover:ring-2 ring-primary/20 transition-all cursor-pointer">
                                    <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="Profile" className="w-full h-full object-cover" />
                                </div>
                            </Link>
                        </>
                    )}
                </div>
            </header>

            {/* Broadcast Banner */}
            {broadcast && !broadcast.isPopup && (
                <div className={`relative z-[60] px-6 py-3 flex items-center justify-between text-sm font-bold animate-in slide-in-from-top duration-500 shadow-lg mx-6 mt-4 rounded-xl
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
                        onClick={onDismissBroadcast}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Main Content Area - No persistent Sidebar */}
            <main ref={mainRef} className="flex-grow flex flex-col p-6 overflow-x-hidden animate-fade-in bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.05),transparent_60%)]">
                <div className="max-w-7xl mx-auto w-full flex-grow flex flex-col">
                    <div className="flex-grow min-h-screen">
                        {children}
                    </div>
                    {/* Hide Footer on immersive pages like Daily Review */}
                    {!location.pathname.includes('/daily-review') && (
                        <Footer className="mt-auto border-t-0 bg-transparent px-0 pt-12" />
                    )}
                </div>
            </main>

            {/* Floating Bottom Nav (Visible on Desktop via override) */}
            {/* The MobileBottomNav usually has 'md:hidden'. We need to override it or use a copy. 
                I'll wrap it in a div that forces visibility or ask the component to not hide.
                Wait, `MobileBottomNav` has `md:hidden` hardcoded.
                I will create an inline Nav here that looks exactly like it but without `md:hidden`.
            */}
            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[100] animate-in slide-in-from-bottom duration-500">
                <div className="glass-card rounded-[2.5rem] border-primary/20 shadow-2xl flex items-center justify-between px-3 py-2.5 bg-background/60 backdrop-blur-2xl transition-all hover:scale-[1.02]">
                    {/* Left Tabs */}
                    <div className="flex items-center justify-around flex-1">
                        <Link to="/" onClick={(e) => handleAuthCheck(e, '/')} className={cn("flex flex-col items-center justify-center p-2 rounded-2xl transition-all relative group", location.pathname === '/' ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground")}>
                            {location.pathname === '/' && <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full shadow-glow" />}
                            <LayoutDashboard className={cn("h-5 w-5", location.pathname === '/' && "stroke-[2.5px]")} />
                            <span className="text-[10px] font-bold mt-1">Home</span>
                        </Link>
                        <Link to="/notebook" onClick={(e) => handleAuthCheck(e, '/notebook')} className={cn("flex flex-col items-center justify-center p-2 rounded-2xl transition-all relative group", location.pathname.startsWith('/notebook') ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground")}>
                            {location.pathname.startsWith('/notebook') && <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full shadow-glow" />}
                            <NotebookPen className={cn("h-5 w-5", location.pathname.startsWith('/notebook') && "stroke-[2.5px]")} />
                            <span className="text-[10px] font-bold mt-1">Notes</span>
                        </Link>
                    </div>

                    {/* Center Action */}
                    <div className="relative mx-2">
                        <Link to="/create" onClick={(e) => handleAuthCheck(e, '/create')}>
                            <Button size="icon" className="h-14 w-14 rounded-full bg-primary shadow-glow hover:scale-110 transition-all border-4 border-background">
                                <Plus className="h-7 w-7 text-white" />
                            </Button>
                        </Link>
                    </div>

                    {/* Right Tabs */}
                    <div className="flex items-center justify-around flex-1">
                        <Link to="/sets" onClick={(e) => handleAuthCheck(e, '/sets')} className={cn("flex flex-col items-center justify-center p-2 rounded-2xl transition-all relative group", location.pathname.startsWith('/sets') ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground")}>
                            {location.pathname.startsWith('/sets') && <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full shadow-glow" />}
                            <Library className={cn("h-5 w-5", location.pathname.startsWith('/sets') && "stroke-[2.5px]")} />
                            <span className="text-[10px] font-bold mt-1">Sets</span>
                        </Link>

                        <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center justify-center p-2 rounded-2xl text-muted-foreground hover:text-foreground transition-all">
                            <Menu className="h-5 w-5" />
                            <span className="text-[10px] font-bold mt-1">More</span>
                        </button>
                    </div>
                </div>
            </nav>


            {/* Menu Drawer (Sheet) - Optimized for Web */}
            {/* Menu Drawer (Sheet) - Optimized for Web */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="bottom" className="h-[85vh] md:h-auto md:mx-auto md:mb-12 md:rounded-[3rem] overflow-hidden rounded-t-[3rem] border-primary/20 bg-background/80 backdrop-blur-3xl z-[150] shadow-2xl p-0 md:max-w-5xl">
                    <div className="h-full md:h-auto md:max-h-[80vh] w-full overflow-y-auto custom-scrollbar">
                        <SheetHeader className="pb-8 md:pb-12 pt-8 px-6 md:px-12">
                            <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mb-6 md:hidden" />
                            <SheetTitle className="text-3xl md:text-5xl font-black tracking-tighter text-center bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">Nova Hub</SheetTitle>
                            <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
                        </SheetHeader>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 p-4 md:p-12 pb-32 md:pb-12 max-w-6xl mx-auto">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={(e) => {
                                        handleAuthCheck(e, item.path);
                                        setMenuOpen(false);
                                    }}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-6 md:p-8 rounded-3xl transition-all border border-border/40 bg-card/40 hover:bg-card/80 hover:scale-[1.02] group",
                                        location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
                                            ? 'bg-primary/10 text-primary border-primary/30 font-bold shadow-xl shadow-primary/10'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <div className={cn("p-4 rounded-2xl bg-background/50 mb-4 transition-colors group-hover:bg-background/80", (location.pathname === item.path) && "bg-primary/20")}>
                                        <item.icon className={cn("h-6 w-6 md:h-8 md:w-8", (location.pathname === item.path) ? "text-primary" : "opacity-70 group-hover:opacity-100 group-hover:text-primary")} />
                                    </div>
                                    <span className="text-sm md:text-lg text-center font-bold tracking-tight">{translateLabel(item.label)}</span>
                                </Link>
                            ))}

                            {/* Admin Link */}
                            {profile?.is_admin && (
                                <Link
                                    to="/admin"
                                    onClick={(e) => {
                                        handleAuthCheck(e, '/admin');
                                        setMenuOpen(false);
                                    }}
                                    className={cn(
                                        "md:col-span-2 flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 p-6 rounded-3xl transition-all border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 group",
                                        location.pathname.startsWith('/admin')
                                            ? 'text-indigo-600 font-bold border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                                            : 'text-indigo-600/80'
                                    )}
                                >
                                    <div className="p-3 rounded-2xl bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                                        <ShieldAlert className="h-6 w-6 md:h-8 md:w-8 text-indigo-500" />
                                    </div>
                                    <div>
                                        <span className="text-base md:text-lg font-bold block">Control Center</span>
                                        <span className="text-xs md:text-sm opacity-70 hidden md:block">Manage users, broadcasts, and system health</span>
                                    </div>
                                </Link>
                            )}

                            <div className="col-span-2 md:col-span-4 border-t border-border/40 mt-6 pt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {bottomNavItems.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={(e) => {
                                            handleAuthCheck(e, item.path);
                                            setMenuOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-center justify-center gap-3 p-4 rounded-2xl transition-all border border-border/20 hover:bg-muted/50",
                                            location.pathname === item.path
                                                ? 'bg-primary/5 text-primary font-bold'
                                                : 'text-muted-foreground'
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span className="text-sm font-bold">{translateLabel(item.label)}</span>
                                    </Link>
                                ))}
                                <Button
                                    variant="ghost"
                                    className="col-span-2 md:col-span-1 justify-center md:justify-start h-14 rounded-2xl text-red-500 hover:bg-red-500/10 hover:text-red-600 font-black"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        user ? handleLogout() : navigate('/login');
                                    }}
                                >
                                    {user ? <LogOut className="mr-3 h-5 w-5" /> : <LogIn className="mr-3 h-5 w-5" />}
                                    {user ? t('sidebar.logout') : t('sidebar.login')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Broadcast Pop-up Modal */}
            <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] border-primary/20 shadow-2xl overflow-hidden glass-card">
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

export default WebDashboardLayout;
