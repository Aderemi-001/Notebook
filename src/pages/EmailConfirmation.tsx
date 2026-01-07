import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2 } from 'lucide-react';

const EmailConfirmation: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-md w-full space-y-8">
        <Card className="glass-card shadow-premium rounded-[2.5rem] p-8 text-center bg-white/50 dark:bg-black/20 border-white/20">
          <CardHeader>
            <CardTitle className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Email Confirmation Test Page
            </CardTitle>
            <CardDescription className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              If you see this, the /confirm-email route is working!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <Button asChild className="mt-4">
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailConfirmation;