import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NotebookCard } from '@/components/NotebookCard';
import { useAuth } from '@/hooks/useAuth';
import { showSuccess } from '@/utils/toast';

const EmailConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your email...');
  const { user: authUser, loading: isLoadingAuth } = useAuth();

  useEffect(() => {
    if (isLoadingAuth) return; // Wait for auth to load

    const confirmEmail = async () => {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      const type = hashParams.get('type') || searchParams.get('type');

      // If user is already logged in, redirect to home
      if (authUser) {
        console.log("Already logged in. Redirecting to home.");
        navigate('/');
        return;
      }

      // This page should only handle 'signup' confirmation
      if (type === 'signup' && accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Error setting session for email confirmation:", error);
            setStatus('error');
            setMessage(`Failed to confirm email: ${error.message}`);
            return;
          }

          if (data.user) {
            setStatus('success');
            setMessage('Your email has been successfully confirmed! Redirecting to home...');
            showSuccess('Email confirmed successfully!');
            setTimeout(() => {
              navigate('/');
            }, 3000);
          } else {
            setStatus('error');
            setMessage('Email confirmation failed. No user data found.');
          }
        } catch (err: any) {
          console.error("Unexpected error during session setting:", err);
          setStatus('error');
          setMessage(`An unexpected error occurred: ${err.message}`);
        }
      } else {
        setStatus('error');
        setMessage('Invalid email confirmation link. Missing access or refresh tokens, or incorrect type.');
      }
    };

    confirmEmail();
  }, [navigate, searchParams, authUser, isLoadingAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-md w-full space-y-8">
        <NotebookCard className="p-8 text-center">
          <CardHeader>
            <CardTitle className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Email Confirmation
            </CardTitle>
            <CardDescription className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-500" />
            )}
            {(status === 'error' || status === 'success') && (
              <Button asChild className="mt-4">
                <Link to="/login">Go to Login</Link>
              </Button>
            )}
          </CardContent>
        </NotebookCard>
      </div>
    </div>
  );
};

export default EmailConfirmation;