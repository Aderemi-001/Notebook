import * as React from 'react';
import { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutDashboard, ArrowLeft, BookOpen, Flame, Trophy, Zap, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';
import { gamificationService } from '@/services/gamificationService';
import { BadgeList } from '@/components/gamification/BadgeList';
import { useSubscription } from '@/hooks/useSubscription';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Types ---

interface StudyStatistics {
  total_cards: number;
  total_mastered_cards: number;
  total_due_cards: number;
  total_study_sets: number;
}

interface StudyDay {
  study_date: string;
}

// --- API Functions ---

const fetchStudyStatistics = async (userId: string): Promise<StudyStatistics> => {
  const { data, error } = await supabase.rpc('get_user_study_statistics', { p_user_id: userId });
  if (error) throw error;
  return data[0];
};

const fetchStudyDays = async (userId: string): Promise<StudyDay[]> => {
  const { data, error } = await supabase.rpc('get_study_days', { p_user_id: userId });
  if (error) throw error;
  return data;
};

// --- Components ---

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, delay }: any) => (
  <div className={`glass-card p-6 rounded-3xl relative overflow-hidden group animate-fade-in`} style={{ animationDelay: `${delay}ms` }}>
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500`}>
      <Icon className="w-24 h-24" />
    </div>
    <div className="relative z-10 flex flex-col justify-between h-full">
      <div>
        <div className={`p-3 rounded-2xl w-fit mb-4 ${colorClass} bg-opacity-20`}>
          <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{title}</p>
      </div>
      <div>
        <h3 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">{value}</h3>
        <p className="text-xs font-medium text-muted-foreground mt-1 opacity-80">{subtitle}</p>
      </div>
    </div>
  </div>
);

const Statistics: React.FC = () => {
  const { user, loading: isLoadingAuth } = useAuth();

  // --- Queries ---

  const { data: stats, isLoading: isLoadingStats } = useQuery<StudyStatistics, Error>({
    queryKey: ['studyStatistics', user?.id],
    queryFn: () => fetchStudyStatistics(user!.id),
    enabled: !!user && !isLoadingAuth,
  });

  const { data: studyDays, isLoading: isLoadingStudyDays } = useQuery<StudyDay[], Error>({
    queryKey: ['studyDays', user?.id],
    queryFn: () => fetchStudyDays(user!.id),
    enabled: !!user && !isLoadingAuth,
  });

  const { data: streakData, isLoading: isLoadingStreak } = useQuery({
    queryKey: ['streakStats', user?.id],
    queryFn: () => gamificationService.getStreakStats(user!.id),
    enabled: !!user && !isLoadingAuth,
  });

  const { isPremium } = useSubscription();

  const { data: badges, isLoading: isLoadingBadges } = useQuery({
    queryKey: ['badges', user?.id],
    queryFn: () => gamificationService.getBadges(user!.id),
    enabled: !!user && !isLoadingAuth,
  });

  const enrichedBadges = useMemo(() => {
    if (!badges || !stats) return [];

    // Create a compatible profile object for the shared rules
    const profileProxy = {
      current_streak: streakData?.current_streak || 0,
      stats: {
        total_sets: stats.total_study_sets || 0,
        mastered_cards: stats.total_mastered_cards || 0
      }
    };

    return gamificationService.enrichBadges(badges, profileProxy, isPremium);
  }, [badges, stats, streakData, isPremium]);

  // Sync badges in background when data is ready
  useEffect(() => {
    if (user && streakData && stats && badges) {
      const profileProxy = {
        current_streak: streakData.current_streak || 0,
        stats: {
          total_sets: stats.total_study_sets || 0,
          mastered_cards: stats.total_mastered_cards || 0
        }
      };
      gamificationService.syncBadges(user.id, profileProxy, isPremium);
    }
  }, [user, streakData, stats, badges, isPremium]);

  // --- Derived Data ---

  // XP Calculation: 100 XP per mastered card + 10 XP per card created
  const estimatedXP = useMemo(() => {
    if (!stats) return 0;
    return (stats.total_mastered_cards * 100) + (stats.total_cards * 10);
  }, [stats]);

  const level = Math.floor(Math.sqrt(estimatedXP / 100)) + 1;
  const nextLevelXP = Math.pow(level, 2) * 100;
  const prevLevelXP = Math.pow(level - 1, 2) * 100;
  const progress = Math.min(100, Math.max(0, ((estimatedXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100));

  // Chart Data: Last 7 days activity
  const chartData = useMemo(() => {
    if (!studyDays) return [];

    // Create map of existing study days
    const daysMap = new Set(studyDays.map(d => d.study_date.split('T')[0]));

    // Generate dates for the last 14 days
    const end = new Date();
    const dates = [];
    for (let i = 13; i >= 0; i--) {
      const d = subDays(end, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      dates.push({
        day: format(d, 'MMM dd'),
        active: daysMap.has(dateStr) ? 1 : 0,
        fullDate: dateStr
      });
    }
    return dates;
  }, [studyDays]);


  if (isLoadingAuth) {
    return <div className="container mx-auto py-10"><Skeleton className="h-96 w-full rounded-3xl" /></div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto py-20 flex flex-col items-center justify-center text-center animate-fade-in">
        <div className="p-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 mb-6">
          <LayoutDashboard className="h-16 w-16 text-indigo-500" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Track your progress</h2>
        <p className="text-muted-foreground max-w-md mb-8">Sign in to unlock detailed statistics, streaks, and gamification rewards.</p>
        <Button asChild size="lg" className="rounded-full px-8">
          <Link to="/login">Log In / Sign Up</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-8 py-6 sm:py-8 md:py-10 animate-fade-in custom-scrollbar pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full mb-2">
            <LayoutDashboard className="h-3 w-3" />
            Statistics Center
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Your Learning Impact
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Visualize your study habits, streaks, and mastery progress.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl border-2">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
        </Button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Current Streak"
          value={isLoadingStreak ? "..." : `${streakData?.current_streak || 0} Days`}
          subtitle={`Longest: ${streakData?.longest_streak || 0}`}
          icon={Flame}
          colorClass="text-orange-500 bg-orange-500"
          delay={0}
        />
        <StatCard
          title="Total XP"
          value={isLoadingStats ? "..." : estimatedXP.toLocaleString()}
          subtitle={`Level ${level} Scholar`}
          icon={Zap}
          colorClass="text-yellow-500 bg-yellow-500"
          delay={100}
        />
        <StatCard
          title="Mastery"
          value={isLoadingStats ? "..." : stats?.total_mastered_cards || 0}
          subtitle={`${stats?.total_cards || 0} total cards`}
          icon={Trophy}
          colorClass="text-emerald-500 bg-emerald-500"
          delay={200}
        />
        <StatCard
          title="Collection"
          value={isLoadingStats ? "..." : stats?.total_study_sets || 0}
          subtitle="Study Sets Created"
          icon={BookOpen}
          colorClass="text-blue-500 bg-blue-500"
          delay={300}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Activity Chart */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="glass-card border-none shadow-premium rounded-[2.5rem] overflow-hidden">
            <CardHeader className="pl-8 pt-8">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-indigo-500" />
                Study Consistency
              </CardTitle>
              <CardDescription>Your activity over the last 14 days</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] w-full pl-0">
              {isLoadingStudyDays ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-40 w-full mx-8 rounded-xl" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12, fill: '#888888' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover text-popover-foreground shadow-lg rounded-xl p-3 text-xs font-bold border">
                              <p>{payload[0].payload.fullDate}</p>
                              <p className="text-primary mt-1">
                                {payload[0].value ? "Studied" : "No Activity"}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="active" radius={[4, 4, 4, 4]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.active ? '#6366f1' : 'rgba(226, 232, 240, 0.3)'} // Indigo 500 vs Slate 200/30
                          className="transition-all duration-500 hover:opacity-80"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Level Progress */}
          <div className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">Level {level} Progress</h3>
              <span className="text-sm font-medium text-muted-foreground">{Math.round(progress)}% to Level {level + 1}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Earn XP by creating cards and mastering content.</p>
            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-mono text-muted-foreground opacity-70">
              <span>{estimatedXP.toLocaleString()} XP</span>
              <span>{nextLevelXP.toLocaleString()} XP</span>
            </div>
          </div>
        </div>

        {/* Badges Column */}
        <div className="lg:col-span-1">
          <Card className="glass-card shadow-premium rounded-[2.5rem] h-full border-none bg-gradient-to-b from-white/60 to-white/30 dark:from-slate-950/60 dark:to-slate-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Recent Badges
              </CardTitle>
              <CardDescription>Unlock achievements as you learn.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Transform badges to match Badge interface (cast category to union type, handle awarded_at) */}
              <BadgeList badges={enrichedBadges.map(badge => ({
                ...badge,
                category: (badge.category === 'general' || badge.category === 'streak' || badge.category === 'mastery' || badge.category === 'creation'
                  ? badge.category
                  : null) as 'general' | 'streak' | 'mastery' | 'creation' | null,
                awarded_at: (typeof badge.awarded_at === 'string' ? badge.awarded_at : undefined)
              }))} isLoading={isLoadingBadges} className="h-[500px]" />
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
};

export default Statistics;