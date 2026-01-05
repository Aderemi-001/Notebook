
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Search,
    Brain,
    Settings,
    LogOut,
    FileText,
    NotebookPen,
    User,
    Plus,
    LogIn,
    Globe,
    Library,
    GraduationCap,
    CreditCard
} from 'lucide-react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { showSuccess } from '@/utils/toast';
import Chatbot from '@/components/Chatbot';
import { useAuth } from '@/hooks/useAuth';

import { useRealtime } from '@/hooks/useRealtime';
import BrandLogo from '@/components/BrandLogo';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Enable Real-time updates
    useRealtime();

    // Check for terms acceptance
    React.useEffect(() => {
        if (!user) return;

        // Define paths that are allowed without agreement
        const allowedPaths = ['/user-agreement', '/terms', '/logout', '/login', '/privacy', '/contact', '/about'];
        if (allowedPaths.includes(location.pathname)) return;

        const checkAgreement = async () => {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('terms_accepted_at')
                .eq('id', user.id)
                .single();

            if (!error && profile && !profile.terms_accepted_at) {
                // If not accepted, redirect to agreement page
                navigate('/user-agreement');
            }
        };

        checkAgreement();
    }, [user, location.pathname, navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        showSuccess('Logged out successfully');
        navigate('/login');
    };

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { label: 'My Notes', icon: NotebookPen, path: '/notebook' },
        { label: 'My Sets', icon: Library, path: '/sets' }, // Changed from BookOpen to Library
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

    const NavItem = ({ item, isMobile = false }: { item: any, isMobile?: boolean }) => {
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

        return (
            <Link
                to={item.path}
                className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                    isActive
                        ? "bg-primary text-primary-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    isMobile && "text-lg px-4 py-3"
                )}
                onClick={(e) => handleAuthCheck(e, item.path)}
            >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{item.label}</span>
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <BrandLogo size="sm" />
                    <span>Notebook</span>
                </div>
                {/* Mobile menu trigger removed in favor of bottom navigation */}
            </div>

            {/* Mobile Menu removed - now using bottom navigation */}

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 shrink-0 border-r bg-card/50 backdrop-blur-sm sticky top-0 h-screen p-4">
                <div className="flex items-center gap-2 font-heading font-bold text-2xl px-2 mb-8 text-primary">
                    <BrandLogo size="md" />
                    <span>Notebook</span>
                </div>

                <div className="relative mb-6">
                    <Button asChild className="w-full shadow-md hover:shadow-lg transition-all" size="lg">
                        <Link to="/create" onClick={(e) => handleAuthCheck(e, '/create')}>
                            <Plus className="mr-2 h-5 w-5" /> Create Set
                        </Link>
                    </Button>
                    <div className="absolute -top-2 -right-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg animate-pulse border border-white/20">
                        v2.0 HYBRID AI
                    </div>
                </div>

                <div className="flex-col flex gap-1">
                    <p className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">Menu</p>
                    {navItems.map(item => <NavItem key={item.path} item={item} />)}
                </div>

                <div className="flex-grow" />

                <div className="flex flex-col gap-1 border-t pt-4">
                    <p className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">Account</p>
                    {bottomNavItems.map(item => <NavItem key={item.path} item={item} />)}

                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start mt-2",
                            user ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10" : "text-primary hover:text-primary/90 hover:bg-primary/10"
                        )}
                        onClick={user ? handleLogout : () => navigate('/login')}
                    >
                        {user ? (
                            <>
                                <LogOut className="mr-2 h-4 w-4" /> Logout
                            </>
                        ) : (
                            <>
                                <LogIn className="mr-2 h-4 w-4" /> Login
                            </>
                        )}
                    </Button>
                </div>

                {/* Footer Attribution */}
                <div className="mt-6 px-3 py-4 bg-muted/30 rounded-xl border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Powered By</p>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-xs font-medium text-foreground/80">Groq Llama 3.3</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-xs font-medium text-foreground/80">Google Gemini Flash</span>
                        </div>
                    </div>
                    <p className="mt-4 text-[10px] text-muted-foreground/60 italic">
                        Version 2.0.4 "Supernova"
                    </p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow p-4 md:p-8 overflow-x-hidden animate-fade-in pb-32 md:pb-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 flex items-center justify-around pb-safe-offset-4 h-16 safe-area-bottom">
                <Link to="/" onClick={(e) => handleAuthCheck(e, '/')} className={cn("flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors", location.pathname === '/' ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400 hover:text-primary')}>
                    <LayoutDashboard className="h-5 w-5" />
                    <span className="text-xs font-medium">Home</span>
                </Link>
                <Link to="/notebook" onClick={(e) => handleAuthCheck(e, '/notebook')} className={cn("flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors", location.pathname.startsWith('/notebook') ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400 hover:text-primary')}>
                    <NotebookPen className="h-5 w-5" />
                    <span className="text-xs font-medium">Notes</span>
                </Link>

                <div className="relative -top-5">
                    <Link to="/create" onClick={(e) => handleAuthCheck(e, '/create')} aria-label="Create new study set">
                        <Button size="icon" className="h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="h-6 w-6" />
                        </Button>
                    </Link>
                </div>

                <Link to="/sets" onClick={(e) => handleAuthCheck(e, '/sets')} className={cn("flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors", location.pathname.startsWith('/sets') ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400 hover:text-primary')}>
                    <Library className="h-5 w-5" />
                    <span className="text-xs font-medium">Sets</span>
                </Link>
                <Link to="/profile" onClick={(e) => handleAuthCheck(e, '/profile')} className={cn("flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors", location.pathname.startsWith('/profile') ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400 hover:text-primary')}>
                    <User className="h-5 w-5" />
                    <span className="text-xs font-medium">Profile</span>
                </Link>

                {/* Mobile Menu */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <button className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-primary">
                            <Menu className="h-5 w-5" />
                            <span className="text-xs font-medium">Menu</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>Navigation Menu</SheetTitle>
                        </SheetHeader>
                        <div className="mt-6 space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={(e) => {
                                        handleAuthCheck(e, item.path);
                                        setMobileMenuOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                        location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
                                            ? 'bg-primary/10 text-primary font-medium'
                                            : 'hover:bg-muted'
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                            <div className="border-t pt-2 mt-2">
                                {bottomNavItems.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={(e) => {
                                            handleAuthCheck(e, item.path);
                                            setMobileMenuOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                            location.pathname === item.path
                                                ? 'bg-primary/10 text-primary font-medium'
                                                : 'hover:bg-muted'
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span>{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <Chatbot />
            <InstallPrompt />
        </div>
    );
};

export default DashboardLayout;
