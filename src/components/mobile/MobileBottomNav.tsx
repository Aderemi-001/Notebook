import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    NotebookPen,
    Plus,
    Library,
    User,
    Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MobileBottomNavProps {
    onMenuClick: () => void;
    onAuthCheck: (e: React.MouseEvent, path: string) => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick, onAuthCheck }) => {
    const location = useLocation();

    // Minimized View logic removed - menu always visible


    const tabs = [
        { label: 'Home', icon: LayoutDashboard, path: '/' },
        { label: 'Notes', icon: NotebookPen, path: '/notebook' },
        { label: 'Sets', icon: Library, path: '/sets' },
        { label: 'Profile', icon: User, path: '/profile' },
    ];

    return (
        <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] z-[100] animate-in slide-in-from-bottom duration-500">
            <div className="glass-card rounded-[2.5rem] border-primary/20 shadow-2xl flex items-center justify-between px-3 py-2.5 bg-background/60 backdrop-blur-2xl">

                {/* Left Tabs */}
                <div className="flex items-center justify-around flex-1">
                    {tabs.slice(0, 2).map((tab) => {
                        const isActive = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path));
                        return (
                            <Link
                                key={tab.path}
                                to={tab.path}
                                onClick={(e) => onAuthCheck(e, tab.path)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 relative",
                                    isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full shadow-glow animate-pulse" />
                                )}
                                <tab.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
                                <span className="text-[10px] font-bold mt-1 tracking-tight">{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Center Action Hub */}
                <div className="relative mx-2">
                    <Link to="/create" onClick={(e) => onAuthCheck(e, '/create')}>
                        <Button
                            size="icon"
                            className="h-14 w-14 rounded-full bg-primary shadow-glow hover:scale-105 active:scale-90 transition-all duration-300 border-4 border-background"
                        >
                            <Plus className="h-7 w-7 text-white" />
                        </Button>
                    </Link>
                </div>

                {/* Right Tabs */}
                <div className="flex items-center justify-around flex-1">
                    {tabs.slice(2, 4).map((tab) => {
                        const isActive = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path));
                        return (
                            <Link
                                key={tab.path}
                                to={tab.path}
                                onClick={(e) => onAuthCheck(e, tab.path)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 relative",
                                    isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full shadow-glow animate-pulse" />
                                )}
                                <tab.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
                                <span className="text-[10px] font-bold mt-1 tracking-tight">{tab.label}</span>
                            </Link>
                        );
                    })}

                    {/* More Menu */}
                    <button
                        onClick={onMenuClick}
                        className="flex flex-col items-center justify-center p-2 rounded-2xl text-muted-foreground hover:text-foreground transition-all"
                    >
                        <Menu className="h-5 w-5 stroke-[1.5px]" />
                        <span className="text-[10px] font-bold mt-1 tracking-tight">More</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default MobileBottomNav;
