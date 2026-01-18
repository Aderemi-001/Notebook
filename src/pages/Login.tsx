import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { showError, showSuccess, showLoading } from '@/utils/toast';
import BrandLogo from '@/components/BrandLogo';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  terms: z.boolean().default(false).optional(),
});

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // State to toggle between login and signup
  const { t } = useLanguage();

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
          console.log('Login error:', error.message, error);
          if (error.message.includes('Email not confirmed')) {
            throw new Error("📧 Please verify your email first! Check your inbox (and spam folder) for a verification email from Supabase, then try signing in again.");
          } else if (error.message.includes('Invalid login credentials')) {
            throw new Error("Invalid email or password. If you don't have an account, please sign up.");
          }
          throw new Error(error.message);
        }
        showSuccess('Signed in successfully!', toastId);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              name: values.email.split('@')[0],
            },
            emailRedirectTo: `${window.location.origin}/confirm-email`,
          },
        });
        if (error) {
          if (error.message.includes('User already registered') || error.message.includes('already registered')) {
            throw new Error("This email is already being used. Please sign in instead.");
          }
          throw new Error(error.message);
        }

        if (data.user && values.terms) {
          await supabase
            .from('profiles')
            .update({ terms_accepted_at: new Date().toISOString() })
            .eq('id', data.user.id);
        }

        showSuccess('Account created! 📧 Please check your email inbox (and spam folder) for a verification link from Supabase.', toastId);
        setIsLogin(true);
      }
    } catch (error: any) {
      showError(error.message || 'An unexpected error occurred.', toastId);
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
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        throw new Error(error.message);
      }
      showSuccess('Password reset email sent! Check your inbox.', toastId);
    } catch (error: any) {
      showError(error.message || 'Failed to send reset email.', toastId);
      console.error('Password reset error:', error);
    }
  };

  return (
    <>
      <div className="hidden lg:grid min-h-screen w-full lg:grid-cols-2 overflow-hidden bg-background">
        {/* Desktop Left Panel */}
        <div className="relative flex flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
          {/* Animated Background Orbs */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Large animated gradient orb */}
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-violet-500/40 to-fuchsia-500/40 rounded-full blur-[100px] animate-wave-pulse" style={{ animationDuration: '8s' }} />

            {/* Medium floating orb */}
            <div className="absolute bottom-[-15%] right-[-5%] w-[50%] h-[50%] bg-gradient-to-tl from-cyan-500/30 to-blue-500/30 rounded-full blur-[80px] animate-wave-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />

            {/* Small accent orb */}
            <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] bg-gradient-to-br from-pink-500/25 to-rose-500/25 rounded-full blur-[60px] animate-wave-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />

            {/* Subtle grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <BrandLogo size="md" rounded="2xl" shadow />
            <span className="font-heading font-bold text-2xl tracking-tight">Notebook</span>
          </div>

          <div className="relative z-10 max-w-lg">
            <blockquote className="space-y-2">
              <p className="text-4xl font-heading font-bold leading-tight bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                "Unlock your potential with smart, AI-powered learning tools."
              </p>
              <p className="text-lg text-white/80">
                Join thousands of students mastering their subjects with Notebook.
              </p>
            </blockquote>
          </div>

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-4 text-xs opacity-70">
              <Link to="/privacy" className="hover:text-white/90 transition-colors">Privacy</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-white/90 transition-colors">Terms</Link>
              <span>•</span>
              <Link to="/contact" className="hover:text-white/90 transition-colors">Support</Link>
            </div>
            <div className="flex items-center gap-3 text-[10px] opacity-60">
              <span>© {new Date().getFullYear()} Notebook | Nova V2</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Powered by <span className="font-semibold">Groq</span> & <span className="font-semibold">Gemini</span>
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Right Panel (Login Form) */}
        <div className="flex items-center justify-center p-24">
          <div className="w-full max-w-sm space-y-8">
            <div className="flex flex-col space-y-2 text-left">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {isLogin ? t('auth.signIn') : t('auth.createAccount')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isLogin ? t('auth.welcomeBack') : t('auth.joinUs')}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.email')}</FormLabel>
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
                      <FormLabel>{t('auth.password')}</FormLabel>
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
                  {isLogin ? t('auth.signIn') : t('auth.signUp')}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              {isLogin ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    {t('auth.noAccount')}{' '}
                    <button onClick={() => setIsLogin(false)} className="text-primary font-semibold hover:underline underline-offset-4">
                      {t('auth.signUp')}
                    </button>
                  </p>
                  <button onClick={handleForgotPassword} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {t('auth.haveAccount')}{' '}
                  <button onClick={() => setIsLogin(true)} className="text-primary font-semibold hover:underline underline-offset-4">
                    {t('auth.signIn')}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE Layout (Optimized Web Design) */}
      <div className="lg:hidden min-h-screen w-full flex flex-col justify-between p-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Large animated gradient orb */}
          <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-gradient-to-br from-violet-500/40 to-fuchsia-500/40 rounded-full blur-[100px] animate-wave-pulse" style={{ animationDuration: '8s' }} />

          {/* Medium floating orb */}
          <div className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[60%] bg-gradient-to-tl from-cyan-500/30 to-blue-500/30 rounded-full blur-[80px] animate-wave-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />

          {/* Small accent orb */}
          <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] bg-gradient-to-br from-pink-500/25 to-rose-500/25 rounded-full blur-[60px] animate-wave-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />

          {/* Subtle grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center gap-3">
          <BrandLogo size="md" rounded="2xl" shadow />
          <span className="font-heading font-bold text-2xl tracking-tight">Notebook</span>
        </div>

        {/* Main Content */}
        <div className="relative z-10 w-full max-w-sm mx-auto space-y-6">
          {/* Tagline */}
          <div className="text-center space-y-2 mb-6">
            <p className="text-2xl font-heading font-bold leading-tight bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              "Unlock your potential with smart, AI-powered learning tools."
            </p>
            <p className="text-sm text-white/70">
              {isLogin ? t('auth.welcomeBack') : t('auth.joinUs')}
            </p>
          </div>

          {/* Content Card */}
          <div className="bg-background/95 text-foreground backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/10">
            <div className="space-y-2 mb-6">
              <h1 className="text-2xl font-bold tracking-tight">
                {isLogin ? t('auth.signIn') : t('auth.createAccount')}
              </h1>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.email')}</FormLabel>
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
                      <FormLabel>{t('auth.password')}</FormLabel>
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
                  {isLogin ? t('auth.signIn') : t('auth.signUp')}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              {isLogin ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    {t('auth.noAccount')}{' '}
                    <button onClick={() => setIsLogin(false)} className="text-primary font-semibold hover:underline underline-offset-4">
                      {t('auth.signUp')}
                    </button>
                  </p>
                  <button onClick={handleForgotPassword} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {t('auth.haveAccount')}{' '}
                  <button onClick={() => setIsLogin(true)} className="text-primary font-semibold hover:underline underline-offset-4">
                    {t('auth.signIn')}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-center gap-4 text-xs opacity-70">
            <Link to="/privacy" className="hover:text-white/90 transition-colors">Privacy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-white/90 transition-colors">Terms</Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-white/90 transition-colors">Support</Link>
          </div>
          <div className="flex flex-col items-center gap-1 text-[10px] opacity-60">
            <span>© {new Date().getFullYear()} Notebook | Nova V2</span>
            <span className="flex items-center gap-1">
              Powered by <span className="font-semibold">Groq</span> & <span className="font-semibold">Gemini</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;