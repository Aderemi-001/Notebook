
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
    GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
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
        { label: 'Practice Quiz', icon: GraduationCap, path: '/exams' }, // Changed from Brain to GraduationCap
        { label: 'Textbook Finder', icon: Search, path: '/textbook-finder' },
        { label: 'Constellation (Beta)', icon: Brain, path: '/constellation' }, // Changed from Quote to Brain
        { label: 'Essay Practice', icon: FileText, path: '/essays' },
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

                <Button asChild className="mb-6 w-full shadow-md hover:shadow-lg transition-all" size="lg">
                    <Link to="/create" onClick={(e) => handleAuthCheck(e, '/create')}>
                        <Plus className="mr-2 h-5 w-5" /> Create Set
                    </Link>
                </Button>

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
            </div>

            <Chatbot />
            <InstallPrompt />
        </div>
    );
};

export default DashboardLayout;
