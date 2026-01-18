import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Footer: React.FC<{ className?: string }> = ({ className }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("mt-4 w-full border-t border-border/40 bg-background/50 backdrop-blur-sm py-4 px-6", className)}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center sm:justify-end gap-6 sm:gap-10 mb-4 text-center sm:text-left">
          {/* Quick Links */}
          <div className="space-y-1 flex flex-col items-center sm:items-start">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 mb-1">Navigation</h4>
            <nav className="flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-1">
              <Link to="/about" className="text-xs text-muted-foreground hover:text-primary transition-colors">About Story</Link>
              <Link to="/pricing" className="text-xs text-muted-foreground hover:text-primary transition-colors">Pro Membership</Link>
              <Link to="/explore-public-sets" className="text-xs text-muted-foreground hover:text-primary transition-colors">Community Sets</Link>
              <Link to="/contact" className="text-xs text-muted-foreground hover:text-primary transition-colors">Support Hub</Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-1 flex flex-col items-center sm:items-start">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70 mb-1">Framework</h4>
            <nav className="flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-1">
              <Link to="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
              <Link to="/user-agreement" className="text-xs text-muted-foreground hover:text-primary transition-colors">User Agreement</Link>
            </nav>
          </div>
        </div>

        {/* Tech Stack & Attribution - Compact Row */}
        <div className="pt-4 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-1 shadow-sm">
                <Sparkles className="text-white h-full w-full" />
              </div>
              <span className="font-heading font-black text-sm tracking-tighter">Notebook</span>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                <Zap className="h-3 w-3 text-orange-500" />
                <span className="text-[9px] font-bold uppercase">Groq</span>
              </div>
              <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                <Crown className="h-3 w-3 text-blue-500" />
                <span className="text-[9px] font-bold uppercase">Gemini</span>
              </div>
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="text-[10px] text-muted-foreground font-medium">
              &copy; {currentYear} Notebook <span className="mx-1">|</span> Nova V2
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};