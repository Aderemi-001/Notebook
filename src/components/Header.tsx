import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  LogOut,
  User,
  BookOpen,
  LayoutDashboard,
  Settings,
  NotebookPen,
  CalendarDays,
  Group,
  Handshake,
  GraduationCap,
  PenTool,
  BookText,
  Globe, // Added Globe icon for Explore Public Sets
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MenuIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export const Header: React.FC = () => {
  const { user } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleLogout = async () => {
    console.log('Logout clicked'); // Debugging log
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navItems: NavItem[] = [
    { name: "Daily Review", href: "/daily-review", icon: <CalendarDays className="mr-2 h-4 w-4" /> },
    { name: "My Study Sets", href: "/", icon: <BookOpen className="mr-2 h-4 w-4" /> },
    { name: "My Notes", href: "/notes", icon: <NotebookPen className="mr-2 h-4 w-4" /> },
    { name: "My Groups", href: "/groups", icon: <Group className="mr-2 h-4 w-4" /> },
    { name: "Exams", href: "/exams", icon: <GraduationCap className="mr-2 h-4 w-4" /> },
    { name: "Essays", href: "/essays", icon: <PenTool className="mr-2 h-4 w-4" /> },
    { name: "Textbook Finder", href: "/textbook-finder", icon: <BookText className="mr-2 h-4 w-4" /> },
    { name: "Explore Public Sets", href: "/explore-public-sets", icon: <Globe className="mr-2 h-4 w-4" /> },
    { name: "Statistics", href: "/dashboard", icon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
    { name: "Collaborations", href: "/collaborations", icon: <Handshake className="mr-2 h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 font-bold text-lg">
          <img src="/my-notebook-logo.svg" alt="My Notebook Logo" className="h-8 w-8" />
          <span>My Notebook</span>
        </Link>

        {user ? (
          <div className="flex items-center space-x-4">
            {/* Desktop Navigation & User Dropdown */}
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link to="/daily-review">Daily Review</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/">My Study Sets</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/notes">My Notes</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/groups">My Groups</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/exams">Exams</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/essays">Essays</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/textbook-finder">Textbook Finder</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/explore-public-sets">Explore Public Sets</Link>
              </Button>

              {/* User Dropdown - now correctly inside the desktop-only div */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} alt="User Avatar" />
                      <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 z-[999]" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.user_metadata?.display_name || user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Sheet Menu - remains visible on mobile */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <MenuIcon className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] flex flex-col">
                {/* User Info in Mobile Menu */}
                <div className="flex items-center space-x-2 px-2 pt-6">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} alt="User Avatar" />
                    <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <p className="text-sm font-medium leading-none truncate">{user.user_metadata?.display_name || user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <Separator className="my-4" />
                
                <ScrollArea className="flex-grow pr-4 -mr-4">
                  <div className="flex flex-col space-y-2">
                    {/* Navigation Items */}
                    {navItems.map((item) => (
                      <Button key={item.name} variant="ghost" asChild className="justify-start" onClick={() => setIsSheetOpen(false)}>
                        <Link to={item.href}>
                          <span className="flex items-center">
                            {item.icon}
                            {item.name}
                          </span>
                        </Link>
                      </Button>
                    ))}
                    <Separator />
                    {/* Profile, Settings, Logout in Mobile Menu */}
                    <Button variant="ghost" asChild className="justify-start" onClick={() => setIsSheetOpen(false)}>
                      <Link to="/profile">
                        <span className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </span>
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild className="justify-start" onClick={() => setIsSheetOpen(false)}>
                      <Link to="/settings">
                        <span className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </span>
                      </Link>
                    </Button>
                    <Button variant="ghost" onClick={() => { handleLogout(); setIsSheetOpen(false); }} className="justify-start text-red-500 hover:text-red-600">
                      <span className="flex items-center">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </span>
                    </Button>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
        )}
      </div>
    </header>
  );
};