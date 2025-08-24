import {
  BookOpen,
  LayoutDashboard,
  NotebookPen,
  CalendarDays,
  Group,
  Handshake,
  GraduationCap,
  PenTool,
  BookText,
  Globe,
  Network,
} from 'lucide-react';
import React from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export const navItems: NavItem[] = [
  { name: "Daily Review", href: "/daily-review", icon: <CalendarDays className="mr-2 h-4 w-4" /> },
  { name: "My Study Sets", href: "/", icon: <BookOpen className="mr-2 h-4 w-4" /> },
  { name: "My Notes", href: "/notes", icon: <NotebookPen className="mr-2 h-4 w-4" /> },
  { name: "My Groups", href: "/groups", icon: <Group className="mr-2 h-4 w-4" /> },
  { name: "Exams", href: "/exams", icon: <GraduationCap className="mr-2 h-4 w-4" /> },
  { name: "Essays", href: "/essays", icon: <PenTool className="mr-2 h-4 w-4" /> },
  { name: "Textbook Finder", href: "/textbook-finder", icon: <BookText className="mr-2 h-4 w-4" /> },
  { name: "Explore Public Sets", href: "/explore-public-sets", icon: <Globe className="mr-2 h-4 w-4" /> },
  { name: "Cognitive Constellation", href: "/constellation", icon: <Network className="mr-2 h-4 w-4" /> },
  { name: "Statistics", href: "/dashboard", icon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
  { name: "Collaborations", href: "/collaborations", icon: <Handshake className="mr-2 h-4 w-4" /> },
];