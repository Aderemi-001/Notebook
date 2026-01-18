import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
    LayoutDashboard,
    Users,
    ShieldAlert,
    Radio,
    Settings,
    LogOut,
    Menu,
    FileText,
    CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import BrandLogo from '@/components/BrandLogo';

export const AdminLayout = () => {
    const { profile, loading, user } = useAuth();
    const location = useLocation();

    // Protect the route
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user || !profile?.is_admin) {
        return <Navigate to="/" replace />;
    }

    const navigation = [
        { name: 'Overview', href: '/admin', icon: LayoutDashboard },
        { name: 'User Management', href: '/admin/users', icon: Users },
        { name: 'Content Moderation', href: '/admin/content', icon: FileText },
        { name: 'System Broadcasts', href: '/admin/broadcasts', icon: Radio },
        { name: 'System Logs', href: '/admin/logs', icon: ShieldAlert },
        { name: 'Transactions', href: '/admin/transactions', icon: CreditCard },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    const isActive = (path: string) => {
        return location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path));
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <BrandLogo size="md" rounded="2xl" shadow />
                    <span className="font-bold text-xl tracking-tight">Nova Admin</span>
                </div>

                <div className="space-y-1">
                    {navigation.map((item) => (
                        <Button
                            key={item.name}
                            variant={isActive(item.href) ? "secondary" : "ghost"}
                            className={`w-full justify-start gap-3 ${isActive(item.href) ? 'bg-primary/10 text-primary font-semibold' : ''}`}
                            asChild
                        >
                            <Link to={item.href}>
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        </Button>
                    ))}
                </div>
            </div>

            <div className="mt-auto p-6 border-t">
                <div className="flex items-center gap-3 px-2 mb-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {profile.display_name?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">{profile.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">Administrator</p>
                    </div>
                </div>
                <Button variant="outline" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50" asChild>
                    <Link to="/">
                        <LogOut className="h-4 w-4" />
                        Exit Admin
                    </Link>
                </Button>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-muted/20">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-64 bg-background border-r fixed inset-y-0 z-50">
                <SidebarContent />
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b z-50 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                    <BrandLogo size="sm" rounded="2xl" shadow />
                    <span className="font-bold">Nova Admin</span>
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-64">
                        <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
                        <SheetDescription className="sr-only">
                            Access dashboard, users, and settings.
                        </SheetDescription>
                        <SidebarContent />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Main Content */}
            <main className="flex-1 md:pl-64 pt-16 md:pt-0">
                <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
