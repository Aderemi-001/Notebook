import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Stars } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandLogo from '@/components/BrandLogo';

const EmailConfirmation: React.FC = () => {
  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      {/* Hyper-Premium Background System */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Animated Mesh Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-wave-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-nova-purple/20 blur-[120px] animate-wave-pulse" style={{ animationDelay: '-2s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-nova-blue/10 blur-[100px] animate-wave-pulse" style={{ animationDelay: '-4s' }} />

        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Floating Orbs for Extra "Wow" */}
      <motion.div
        animate={{ y: [0, -20, 0], opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-4 h-4 rounded-full bg-primary blur-sm z-0"
      />
      <motion.div
        animate={{ y: [0, 30, 0], opacity: [0.05, 0.2, 0.05] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 right-1/3 w-6 h-6 rounded-full bg-nova-purple blur-md z-0"
      />

      <div className="relative z-10 max-w-xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="glass-card overflow-hidden border-white/20 dark:border-white/10 rounded-[2.5rem] p-1 shadow-2xl">
            <div className="bg-white/40 dark:bg-black/20 backdrop-blur-2xl px-8 py-12 rounded-[2.3rem] text-center border border-white/10">
              <CardHeader className="p-0 mb-8 items-center">
                <div className="mb-6">
                  <BrandLogo size="md" rounded="xl" shadow glow />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.3
                  }}
                  className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 relative"
                >
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-primary/20 rounded-3xl"
                  />
                </motion.div>

                <CardTitle className="text-4xl md:text-5xl font-heading font-black tracking-tight text-foreground mb-4">
                  Account <span className="text-primary italic">Verified</span>
                </CardTitle>

                <CardDescription className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Your journey with <span className="text-foreground font-semibold">Notebook</span> begins now. Your email has been successfully confirmed.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-8 bg-muted/30 px-4 py-2 rounded-full border border-border/50">
                  <Stars className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Pro Features Unlocked</span>
                </div>

                <div className="w-full max-w-xs space-y-4">
                  <Button
                    size="lg"
                    className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 group overflow-hidden relative"
                    onClick={() => {
                      // Redirect to dashboard if session already exists (standard behavior for Supabase redirect)
                      window.location.href = '/';
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Start Learning
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary to-nova-purple z-0"
                      whileHover={{ scale: 1.05 }}
                    />
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Redirecting you to the dashboard...
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
          className="mt-8 text-center text-sm font-medium text-muted-foreground/60"
        >
          © 2026 Nova V2 · Supernova Ultra Design System
        </motion.p>
      </div>
    </div>
  );
};

export default EmailConfirmation;