import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t bg-background py-6">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex flex-col md:flex-row items-center gap-2">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Notebook. v1.0
          </p>
          <span className="hidden md:inline text-muted-foreground/30">|</span>
          <p className="text-sm text-muted-foreground">
            Created by <span className="font-medium text-primary/80">Aderemi Adesanmi</span>
          </p>
          <span className="hidden md:inline text-muted-foreground/30">|</span>
          <p className="text-[10px] text-muted-foreground opacity-60 uppercase tracking-tighter">
            AI Powered by <span className="font-bold">Groq</span>
          </p>
        </div>
        <nav className="flex gap-4">
          <Link to="/about" className="text-sm text-muted-foreground hover:text-primary">
            About
          </Link>
          <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary">
            Contact
          </Link>
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
};