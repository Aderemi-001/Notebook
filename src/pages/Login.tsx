import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import BrandLogo from '@/components/BrandLogo';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  terms: z.boolean().default(false).optional(),
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
      if (!isLogin && !values.terms) {
        throw new Error("You must agree to the Terms and Conditions to sign up.");
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) {
          // Provide a more specific error message for login failures
          if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
            throw new Error("Invalid email or password. If you don't have an account, please sign up.");
          }
          throw new Error(error.message);
        }
        showSuccess('Signed in successfully!');
      } else {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              name: values.email.split('@')[0], // Changed from 'display_name' to 'name'
            },
            emailRedirectTo: `${window.location.origin}/confirm-email`, // Redirect to the new confirmation page
          },
        });
        if (error) {
          throw new Error(error.message);
        }
        // Updated success message with spam warning
        showSuccess('Account created! Please check your email to confirm. If you don\'t see it, please check your spam or junk folder.');
        setIsLogin(true);
      }
      dismissToast(toastId);
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || 'An unexpected error occurred.');
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
        redirectTo: `${window.location.origin}/reset-password`, // Redirect to the new password reset page
      });
      if (error) {
        throw new Error(error.message);
      }
      showSuccess('Password reset email sent! Check your inbox.');
      dismissToast(toastId);
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || 'Failed to send reset email.');
      console.error('Password reset error:', error);
    }
  };

  return (
    <>
      <div className="hidden lg:grid min-h-screen w-full lg:grid-cols-2 overflow-hidden bg-background">
        {/* Desktop Left Panel */}
        <div className="relative flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white overflow-hidden">
          {/* Decorative Circles */}
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-400/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-400/30 rounded-full blur-[120px]" />

          <div className="relative z-10 flex items-center gap-3">
            <BrandLogo size="md" rounded="2xl" shadow />
            <span className="font-heading font-bold text-2xl tracking-tight">Notebook</span>
          </div>

          <div className="relative z-10 max-w-lg">
            <blockquote className="space-y-2">
              <p className="text-4xl font-heading font-bold leading-tight">
                "Unlock your potential with smart, AI-powered learning tools."
              </p>
              <p className="text-lg text-white/80">
                Join thousands of students mastering their subjects with Notebook.
              </p>
            </blockquote>
          </div>

          <div className="relative z-10 text-sm opacity-60">
            © 2026 Notebook App. All rights reserved.
          </div>
        </div>

        {/* Desktop Right Panel (Login Form) */}
        <div className="flex items-center justify-center p-24">
          <div className="w-full max-w-sm space-y-8">
            <div className="flex flex-col space-y-2 text-left">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {isLogin ? 'Sign in' : 'Create an account'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isLogin ? 'Enter your email and password to access your account.' : 'Enter your email and password to get started.'}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isLogin && (
                  <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal text-muted-foreground">
                            I agree to the <Link to="/terms" className="text-primary hover:underline" target="_blank">Terms</Link> and <Link to="/privacy" className="text-primary hover:underline" target="_blank">Privacy Policy</Link>.
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                <Button type="submit" className="w-full h-11 bg-primary font-semibold shadow-sm hover:opacity-90 transition-opacity">
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              {isLogin ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Don't have an account?{' '}
                    <button onClick={() => setIsLogin(false)} className="text-primary font-semibold hover:underline underline-offset-4">
                      Sign Up
                    </button>
                  </p>
                  <button onClick={handleForgotPassword} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot your password?
                  </button>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Already have an account?{' '}
                  <button onClick={() => setIsLogin(true)} className="text-primary font-semibold hover:underline underline-offset-4">
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE Layout (Custom Design) */}
      <div className="lg:hidden min-h-screen w-full flex flex-col justify-center px-6 py-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Background Orbs */}
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-purple-500/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-500/30 rounded-full blur-[100px]" />

        <div className="relative z-10 w-full max-w-sm mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <BrandLogo size="xl" rounded="2xl" shadow />
            <h1 className="text-3xl font-bold text-white tracking-tight">Notebook</h1>
            <p className="text-white/80 font-medium">
              {isLogin ? 'Welcome back! Sign in to continue.' : 'Join us and start learning smarter.'}
            </p>
          </div>

          {/* Content Card */}
          <div className="bg-white/95 text-foreground backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="ml-1">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} className="h-11 bg-slate-50 border-slate-200" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="ml-1">Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="h-11 bg-slate-50 border-slate-200" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isLogin && (
                  <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="bg-slate-50 border-slate-300"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal text-muted-foreground">
                            I agree to the <Link to="/terms" className="text-primary hover:underline" target="_blank">Terms</Link> and <Link to="/privacy" className="text-primary hover:underline" target="_blank">Privacy Policy</Link>.
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                <Button type="submit" className="w-full h-11 bg-primary font-bold shadow-lg hover:shadow-xl hover:opacity-90 transition-all rounded-xl mt-2">
                  {isLogin ? 'Sign In' : 'Sign Up'}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              {isLogin ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    New here?{' '}
                    <button onClick={() => setIsLogin(false)} className="text-primary font-bold hover:underline underline-offset-4">
                      Create Account
                    </button>
                  </p>
                  <button onClick={handleForgotPassword} className="text-xs text-muted-foreground/80 hover:text-primary transition-colors">
                    Forgot password?
                  </button>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Have an account?{' '}
                  <button onClick={() => setIsLogin(true)} className="text-primary font-bold hover:underline underline-offset-4">
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 w-full text-center">
          <p className="text-white/40 text-xs font-medium">© 2026 Notebook App</p>
        </div>
      </div>
    </>
  );
};

export default Login;