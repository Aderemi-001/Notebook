import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/hooks/useAuth';

// Schema for password reset form
const passwordResetSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"],
});

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

const PasswordReset: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready_to_reset'>('loading');
  const [message, setMessage] = useState('Verifying password reset link...');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const { user: authUser, loading: isLoadingAuth } = useAuth();

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  useEffect(() => {
    if (isLoadingAuth) return; // Wait for auth to load

    const handleRecovery = async () => {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      const type = hashParams.get('type') || searchParams.get('type');

      // If user is already logged in, and this is not a recovery flow, redirect to home
      // This prevents a logged-in user from accidentally landing here via a stale link
      if (authUser && type !== 'recovery') {
        console.log("Already logged in and not in recovery flow. Redirecting to home.");
        navigate('/');
        return;
      }

      if (type === 'recovery' && accessToken && refreshToken) {
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
          setStatus('ready_to_reset');
          setMessage('Please enter your new password.');
        } catch (err: any) {
          console.error("Unexpected error during recovery session setting:", err);
          setStatus('error');
          setMessage(`An unexpected error occurred: ${err.message}`);
        }
      } else {
        setStatus('error');
        setMessage('Invalid password reset link. Missing access or refresh tokens, or incorrect type.');
      }
    };

    handleRecovery();
  }, [navigate, searchParams, authUser, isLoadingAuth]);

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
        <Card className="glass-card shadow-premium rounded-[2.5rem] p-8 text-center bg-white/50 dark:bg-black/20 border-white/20">
          <CardHeader>
            <CardTitle className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Reset Your Password
            </CardTitle>
            <CardDescription className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-red-500" />
                <Button asChild className="mt-4">
                  <Link to="/login">Go to Login</Link>
                </Button>
              </>
            )}
            {status === 'ready_to_reset' && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePasswordReset)} className="w-full space-y-6">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
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
                    render={({ field }) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasswordReset;