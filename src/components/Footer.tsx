import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t bg-background py-6">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} My Notebook. All rights reserved.
        </p>
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