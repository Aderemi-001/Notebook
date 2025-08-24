import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NotebookCard } from '@/components/NotebookCard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // State to toggle between login and signup

  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (values: z.infer<typeof authSchema>) => {
    const toastId = showLoading(isLogin ? 'Signing in...' : 'Signing up...');
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) {
          // Check for specific error message indicating user not found
          if (error.message.includes('Invalid login credentials') || error.message.includes('User not found')) {
            throw new Error("It looks like you don't have an account. Please sign up!");
          }
          throw error;
        }
        showSuccess('Signed in successfully!');
      } else {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              display_name: values.email.split('@')[0], // Default display name
            },
            emailRedirectTo: `${window.location.origin}/login`, // Redirect to login page after email confirmation
          },
        });
        if (error) throw error;
        showSuccess('Account created! Please check your email to confirm.');
        setIsLogin(true); // Switch back to login after signup
      }
      dismissToast(toastId);
    } catch (error: any) {
      dismissToast(toastId);
      let userFriendlyMessage = error.message || 'An unexpected error occurred.';
      if (error.message.includes('Email rate limit exceeded')) {
        userFriendlyMessage = "Too many requests. Please wait a few minutes before trying again.";
      }
      showError(userFriendlyMessage);
      console.error('Auth error:', error);
    }
  };

  const handleForgotPassword = async () => {
    const email = form.getValues('email');
    if (!email) {
      showError('Please enter your email address to reset your password.');
      return;
    }

    const toastId = showLoading('Sending password reset email...');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?reset=true`, // Redirect back to login page with reset flag
      });
      if (error) throw error;
      showSuccess('Password reset email sent! Check your inbox.');
      dismissToast(toastId);
    } catch (error: any) {
      dismissToast(toastId);
      let userFriendlyMessage = error.message || 'Failed to send reset email.';
      if (error.message.includes('Email rate limit exceeded')) {
        userFriendlyMessage = "Too many password reset requests. Please wait a few minutes before trying again.";
      }
      showError(userFriendlyMessage);
      console.error('Password reset error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 login-page-scribble-bg animate-fade-in">
      <div className="max-w-md w-full space-y-8">
        <NotebookCard className="p-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-extrabold text-gray-900">
              My Notebook
            </CardTitle>
            <CardDescription className="mt-2 text-sm text-gray-600">
              {isLogin ? 'Sign in to your account' : 'Create your account to get started!'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
              {isLogin ? (
                <>
                  Don't have an account?{' '}
                  <Button variant="link" onClick={() => setIsLogin(false)} className="p-0 h-auto">
                    Sign Up
                  </Button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Button variant="link" onClick={() => setIsLogin(true)} className="p-0 h-auto">
                    Sign In
                  </Button>
                </>
              )}
            </div>
            {isLogin && (
              <div className="mt-2 text-center text-sm">
                <Button variant="link" onClick={handleForgotPassword} className="p-0 h-auto">
                  Forgot your password?
                </Button>
              </div>
            )}
          </CardContent>
        </NotebookCard>
      </div>
    </div>
  );
};

export default Login;