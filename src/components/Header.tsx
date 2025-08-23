import React from 'react';
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
  Globe,
  NotebookPen,
  CalendarDays,
  Group,
  Handshake,
  PlusCircle,
  Brain,
  Network,
  History,
  FileText,
  CalendarCheck,
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
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea

export const Header: React.FC = () => {
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navItems = [
    { name: "My Study Sets", href: "/", icon: <BookOpen className="mr-2 h-4 w-4" /> },
    { name: "Daily Review", href: "/daily-review", icon: <CalendarDays className="mr-2 h-4 w-4" /> },
    { name: "Create Set", href: "/create", icon: <PlusCircle className="mr-2 h-4 w-4" /> },
    { name: "Explore Public Sets", href: "/explore-public-sets", icon: <Globe className="mr-2 h-4 w-4" /> },
    { name: "Generate Exam", href: "/generate-exam", icon: <Brain className="mr-2 h-4 w-4" /> },
    { name: "Generate Essay Questions", href: "/generate-essay-questions", icon: <FileText className="mr-2 h-4 w-4" /> },
    { name: "Cognitive Constellation", href: "/constellation", icon: <Network className="mr-2 h-4 w-4" /> },
    { name: "Past Exams", href: "/past-exams", icon: <CalendarCheck className="mr-2 h-4 w-4" /> },
    { name: "Past Essay Questions", href: "/past-essay-questions", icon: <History className="mr-2 h-4 w-4" /> },
    { name: "My Notes", href: "/notes", icon: <NotebookPen className="mr-2 h-4 w-4" /> },
    { name: "My Groups", href: "/groups", icon: <Group className="mr-2 h-4 w-4" /> },
    { name: "Collaborations", href: "/collaborations", icon: <Handshake className="mr-2 h-4 w-4" /> },
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
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
                <Link to="/">My Study Sets</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/daily-review">Daily Review</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/notes">My Notes</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/groups">My Groups</Link>
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
                <DropdownMenuContent className="w-56" align="end" forceMount>
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
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <MenuIcon className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] sm:w-[300px] flex flex-col"> {/* Added flex flex-col */}
                {/* User Info in Mobile Menu */}
                <div className="flex items-center space-x-2 px-2 pt-6">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`} alt="User Avatar" />
                    <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium leading-none">{user.user_metadata?.display_name || user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Separator className="my-4" /> {/* Added margin to separator */}
                
                <ScrollArea className="flex-grow pr-4 -mr-4"> {/* Scrollable area */}
                  <div className="flex flex-col space-y-2"> {/* Adjusted space-y */}
                    {/* Navigation Items */}
                    {navItems.map((item) => (
                      <Button key={item.name} variant="ghost" asChild className="justify-start">
                        <Link to={item.href}>
                          {item.icon}
                          {item.name}
                        </Link>
                      </Button>
                    ))}
                    <Separator />
                    {/* Profile, Settings, Logout in Mobile Menu */}
                    <Button variant="ghost" asChild className="justify-start">
                      <Link to="/profile">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link to="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                    <Button variant="ghost" onClick={handleLogout} className="justify-start text-red-500 hover:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
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