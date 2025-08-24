import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NotebookCard } from '@/components/NotebookCard';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { showError, showSuccess } from '@/utils/toast';

// Schema for password reset form
const passwordResetSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"],
});

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

const EmailConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'password_reset'>('loading');
  const [message, setMessage] = useState('Confirming your email...');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  useEffect(() => {
    const confirmSession = async () => {
      // Parse hash fragment for tokens and type
      const hash = window.location.hash.substring(1); // Remove the '#'
      const hashParams = new URLSearchParams(hash);

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type'); // Get type from hash

      // Fallback to query params if not found in hash (less likely with new redirectTo)
      const queryType = searchParams.get('type'); // Keep this for robustness

      const finalType = type || queryType;

      if (finalType === 'recovery') {
        if (accessToken && refreshToken) {
          try {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error("Error setting session for recovery:", error);
              setStatus('error');
              setMessage(`Failed to process password reset link: ${error.message}`);
              return;
            }
            setStatus('password_reset');
            setMessage('Please enter your new password.');
          } catch (err: any) {
            console.error("Unexpected error during recovery session setting:", err);
            setStatus('error');
            setMessage(`An unexpected error occurred: ${err.message}`);
          }
        } else {
          setStatus('error');
          setMessage('Invalid password reset link. Missing tokens.');
        }
      } else if (accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Error setting session:", error);
            setStatus('error');
            setMessage(`Failed to confirm email: ${error.message}`);
            return;
          }

          if (data.user) {
            setStatus('success');
            setMessage('Your email has been successfully confirmed! Redirecting to home...');
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
        setMessage('Invalid confirmation link. Missing access or refresh tokens.');
      }
    };

    confirmSession();
  }, [navigate, searchParams]);

  const handlePasswordReset = async (values: PasswordResetFormValues) => {
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      showSuccess('Your password has been reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      showError(err.message || 'Failed to reset password.');
      console.error('Password reset error:', err);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-md w-full space-y-8">
        <NotebookCard className="p-8 text-center">
          <CardHeader>
            <CardTitle className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              {status === 'password_reset' ? 'Reset Your Password' : 'Email Confirmation'}
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
            {status === 'password_reset' && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePasswordReset)} className="w-full space-y-6">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmNewPassword"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isUpdatingPassword}>
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </form>
              </Form>
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