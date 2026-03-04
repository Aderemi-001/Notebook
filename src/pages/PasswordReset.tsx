import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, XCircle, ShieldCheck, Lock, ArrowRight, Stars, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '@/components/BrandLogo';

// Schema for identity verification
const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;

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
  const [status, setStatus] = useState<'loading' | 'error' | 'verify_identity' | 'ready_to_reset'>('loading');
  const [message, setMessage] = useState('Verifying security link...');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const { user: authUser, loading: isLoadingAuth } = useAuth();
  const { t } = useLanguage();

  const verifyForm = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const [resetEmail, setResetEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isLoadingAuth) return;

    const handleRecovery = async () => {
      const hashParams = new URL(window.location.href.replace('#', '?')).searchParams;
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      console.log("Recovery Debug:", { type, hasAccess: !!accessToken, hasAuthUser: !!authUser });

      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          setMessage('Synchronizing security session...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setStatus('error');
            setMessage(`Failed to validate security link: ${error.message}`);
            return;
          }

          if (data.user) {
            setResetEmail(data.user.email || null);
            // Move to verification step instead of direct reset
            setStatus('verify_identity');
            setMessage('For security, please confirm the email address associated with your account.');
          } else {
            throw new Error("No user found in recovery session.");
          }
          return;
        } catch (err: any) {
          setStatus('error');
          setMessage(`An unexpected security error occurred: ${err.message}`);
          return;
        }
      }

      if (authUser) {
        setResetEmail(authUser.email || null);
        setStatus('verify_identity');
        setMessage('For security, please confirm the email address associated with your account.');
        return;
      }

      if (status !== 'ready_to_reset' && status !== 'verify_identity') {
        setStatus('error');
        setMessage('Invalid or expired password reset link. Please request a new one from the login page.');
      }
    };

    handleRecovery();
  }, [navigate, searchParams, authUser, isLoadingAuth, t]);

  const handleVerifyEmail = (values: VerifyEmailFormValues) => {
    if (resetEmail && values.email.trim().toLowerCase() === resetEmail.toLowerCase()) {
      setStatus('ready_to_reset');
      setMessage(t('auth.resetReady'));
      showSuccess('Identity verified. You can now set your new password.');
    } else {
      showError('The email address entered does not match our records for this reset request.');
    }
  };

  const handlePasswordReset = async (values: PasswordResetFormValues) => {
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (error) throw new Error(error.message);

      showSuccess('Your password has been reset successfully! Redirecting to login...');

      // Force sign out to ensure they log in fresh
      await supabase.auth.signOut();

      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      showError(err.message || 'Failed to reset password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      {/* Hyper-Premium Background System */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-primary/15 blur-[130px] animate-wave-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-nova-purple/15 blur-[130px] animate-wave-pulse" style={{ animationDelay: '-2s' }} />
        <div className="absolute top-[20%] right-[10%] w-[35%] h-[35%] rounded-full bg-nova-blue/10 blur-[110px] animate-wave-pulse" style={{ animationDelay: '-4s' }} />

        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Floating Orbs */}
      <motion.div
        animate={{ y: [0, -30, 0], x: [0, 10, 0], opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-3 h-3 rounded-full bg-primary blur-sm z-0"
      />
      <motion.div
        animate={{ y: [0, 40, 0], x: [0, -15, 0], opacity: [0.05, 0.25, 0.05] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 right-1/4 w-5 h-5 rounded-full bg-nova-purple blur-md z-0"
      />

      <div className="relative z-10 max-w-xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="glass-card overflow-hidden border-white/20 dark:border-white/10 rounded-[2.5rem] p-1 shadow-2xl">
            <div className="bg-white/40 dark:bg-black/20 backdrop-blur-2xl px-8 py-10 rounded-[2.3rem] text-center border border-white/10">
              <CardHeader className="p-0 mb-8 items-center">
                <div className="mb-6">
                  <BrandLogo size="md" rounded="xl" shadow glow />
                </div>

                <AnimatePresence mode="wait">
                  {status === 'loading' ? (
                    <motion.div
                      key="loading"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6"
                    >
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    </motion.div>
                  ) : status === 'ready_to_reset' || status === 'verify_identity' ? (
                    <motion.div
                      key="ready"
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 relative"
                    >
                      <ShieldCheck className="h-10 w-10 text-primary" />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-primary/20 rounded-3xl"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="error"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6"
                    >
                      <XCircle className="h-10 w-10 text-red-500" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <CardTitle className="text-3xl md:text-4xl font-heading font-black tracking-tight text-foreground mb-4">
                  {status === 'verify_identity' ? 'Verify' : (status === 'ready_to_reset' ? 'Secure' : 'Password')} <span className="text-primary italic">{status === 'ready_to_reset' ? 'Update' : (status === 'verify_identity' ? 'Account' : 'Reset')}</span>
                </CardTitle>

                <CardDescription className="text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {message}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0 flex flex-col items-center">
                {status === 'verify_identity' && (
                  <Form {...verifyForm}>
                    <form onSubmit={verifyForm.handleSubmit(handleVerifyEmail)} className="w-full space-y-5 text-left">
                      <FormField
                        control={verifyForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-foreground/80">Account Email Address</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  placeholder="name@example.com"
                                  {...field}
                                  className="h-12 pl-10 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 transition-all shadow-inner"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-14 mt-4 rounded-xl text-lg font-bold shadow-xl shadow-primary/20 group overflow-hidden relative"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          Verify Identity
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-primary to-nova-purple z-0"
                          whileHover={{ scale: 1.05 }}
                        />
                      </Button>
                    </form>
                  </Form>
                )}

                {status === 'ready_to_reset' && (
                  <Form {...resetForm}>
                    <form onSubmit={resetForm.handleSubmit(handlePasswordReset)} className="w-full space-y-5 text-left">
                      <FormField
                        control={resetForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-foreground/80">New Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                                <PasswordInput
                                  placeholder="••••••••"
                                  {...field}
                                  className="h-12 pl-10 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 transition-all shadow-inner"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={resetForm.control}
                        name="confirmNewPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-foreground/80">Confirm New Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                                <PasswordInput
                                  placeholder="••••••••"
                                  {...field}
                                  className="h-12 pl-10 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 transition-all shadow-inner"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-14 mt-4 rounded-xl text-lg font-bold shadow-xl shadow-primary/20 group overflow-hidden relative"
                        disabled={isUpdatingPassword}
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {isUpdatingPassword ? 'Updating Your Security...' : 'Complete Reset'}
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-primary to-nova-purple z-0"
                          whileHover={{ scale: 1.05 }}
                        />
                      </Button>
                    </form>
                  </Form>
                )}

                {status === 'error' && (
                  <Button asChild className="w-full h-12 rounded-xl text-base font-semibold">
                    <Link to="/login" className="flex items-center justify-center gap-2">
                      Back to Secure Login
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                )}

                <div className="mt-8 pt-8 border-t border-border/30 w-full flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 bg-muted/40 px-4 py-2 rounded-full border border-border/40">
                    <Stars className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/80">Nova V2 Security Protocol</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed text-center">
                    Need help? Contact our support team at <br />
                    <a href="mailto:my.notebook.by.remi@gmail.com" className="text-primary font-semibold hover:underline">my.notebook.by.remi@gmail.com</a>
                  </p>
                </div>
              </CardContent>
            </div>
          </Card>
        </motion.div>

        {/* Brand Support */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center text-xs font-medium text-muted-foreground/50"
        >
          © 2026 Nova V2 · Project Novea · Supernova Ultra Design System
        </motion.p>
      </div>
    </div>
  );
};

export default PasswordReset;