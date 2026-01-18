import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { studySetService, StudySet } from '@/services/studySetService';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
    BookOpen,
    Plus,
    TrendingUp,
    Zap,
    Brain,
    History,
    Sparkles,
    Target
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { StudyRiskScore } from '@/components/dashboard/StudyRiskScore';
import { analyticsService } from '@/services/analyticsService';
import SmartStudySuggestions from '@/components/dashboard/SmartStudySuggestions';
import RecentActivity from '@/components/dashboard/RecentActivity';

const DashboardMobile: React.FC = () => {
    const { user, profile, loading: isLoadingAuth } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();

    const { data: studySets, isLoading } = useQuery<StudySet[], Error>({
        queryKey: ['studySets', user?.id],
        queryFn: studySetService.getMyStudySets,
        enabled: !!user && !isLoadingAuth,
    });

    // Fetch unified dashboard stats to match Web exactly
    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats-mobile-unified', user?.id],
        queryFn: async () => {
            if (!user) return null;

            // 1. Total Sets
            const sets = await studySetService.getMyStudySets();
            const totalSets = sets.length;

            // 2. Cards Studied Today
            const today = new Date().toISOString().split('T')[0];
            const { count: cardsToday } = await supabase
                .from('user_progress')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('last_reviewed_at', `${today}T00:00:00`)
                .lte('last_reviewed_at', `${today}T23:59:59`);

            // 3. Mastery Rate
            const { data: progressData } = await supabase
                .from('user_progress')
                .select('repetition_level, status')
                .eq('user_id', user.id);

            const masteredCount = progressData?.filter(p => p.status === 'mastered' || (p.repetition_level || 0) >= 4).length || 0;
            const totalCards = progressData?.length || 0;
            const masteryRate = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

            // 4. Streak
            const { data: profileStats } = await supabase
                .from('profiles')
                .select('current_streak')
                .eq('id', user.id)
                .single();

            return {
                totalSets,
                cardsToday: cardsToday || 0,
                masteryRate,
                streak: profileStats?.current_streak || 0
            };
        },
        enabled: !!user,
    });

    const { data: riskData } = useQuery({
        queryKey: ['studyRisk', user?.id],
        queryFn: () => user ? analyticsService.getStudyRiskScore(user.id) : Promise.resolve({ score: 0, trend: 'stable' as const }),
        enabled: !!user,
    });

    if (isLoadingAuth) {
        return (
            <div className="space-y-6 pb-24">
                <Skeleton className="h-48 w-full rounded-[2.5rem]" />
                <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                </div>
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Native-style Welcome Header */}
            <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 text-primary">
                            {(() => {
                                const hour = new Date().getHours();
                                if (hour < 5) return "Late night grind?";
                                if (hour < 12) return t('dashboard.goodMorning');
                                if (hour < 18) return t('dashboard.goodAfternoon');
                                return t('dashboard.goodEvening');
                            })()} {t('dashboard.scholar')}
                        </p>
                        <h1 className="text-3xl font-black tracking-tighter">
                            {profile?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
                        </h1>
                    </div>
                    <div className="relative" onClick={() => navigate('/profile')}>
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                        <div className="h-12 w-12 rounded-2xl border-2 border-primary/20 bg-background/50 backdrop-blur-xl flex items-center justify-center p-0.5">
                            <img src={profile?.avatar_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${user?.id}`} className="rounded-xl w-full h-full object-cover" alt="Avatar" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mastery Score / Stats - Unified metrics */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-950 p-6 text-white shadow-2xl">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <Badge className="bg-white/10 text-indigo-200 border-white/10 py-1.5 px-3 rounded-full text-[10px] font-black tracking-[0.1em]">
                            STREAK: {stats?.streak || 0} {stats?.streak === 1 ? 'DAY' : 'DAYS'}
                        </Badge>
                        <Sparkles className="h-5 w-5 text-nova-blue" />
                    </div>

                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-4xl font-black tracking-tighter mb-1">{stats?.masteryRate || 0}%</p>
                            <p className="text-[10px] font-bold text-indigo-200/60 uppercase tracking-widest">Mastery Rate</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-indigo-400 opacity-30" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                            <p className="text-lg font-black">{stats?.totalSets || 0}</p>
                            <p className="text-[10px] text-indigo-200/50 uppercase font-bold tracking-wider">Study Sets</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                            <p className="text-lg font-black">{stats?.cardsToday || 0}</p>
                            <p className="text-[10px] text-indigo-200/50 uppercase font-bold tracking-wider">Studied Today</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Suggestions - Missing from mobile previously */}
            <div className="px-1 scale-95 origin-left">
                <SmartStudySuggestions layout="compact" />
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                        Quick Access
                    </h2>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {[
                        { icon: Plus, label: "Create", path: '/create', color: 'bg-indigo-500' },
                        { icon: Brain, label: "Learn", path: '/sets', color: 'bg-purple-500' },
                        { icon: History, label: "Review", path: '/daily-review', color: 'bg-pink-500' },
                        { icon: Target, label: "Exams", path: '/exams', color: 'bg-emerald-500' },
                    ].map((btn, idx) => (
                        <button
                            key={idx}
                            onClick={() => navigate(btn.path)}
                            className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
                        >
                            <div className={`h-14 w-14 ${btn.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                                <btn.icon className="h-6 w-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{btn.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent Activity - Missing from mobile previously */}
            <div className="px-1">
                <RecentActivity />
            </div>

            {/* Library Glimpse */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-black tracking-tight">Your Library</h2>
                    <Button variant="ghost" size="sm" className="text-primary font-bold active:scale-95" onClick={() => navigate('/sets')}>
                        See All
                    </Button>
                </div>

                <ScrollArea className="w-full whitespace-nowrap overflow-visible">
                    <div className="flex space-x-4 pb-4 px-1">
                        {isLoading ? (
                            [1, 2, 3].map(i => <Skeleton key={i} className="h-44 w-40 shrink-0 rounded-3xl" />)
                        ) : studySets && studySets.length > 0 ? (
                            studySets.slice(0, 5).map((set) => (
                                <div
                                    key={set.id}
                                    onClick={() => navigate(`/sets/${set.id}`)}
                                    className="h-44 w-40 shrink-0 glass-card p-5 flex flex-col justify-between active:scale-95 transition-transform border border-border/40 relative overflow-hidden group"
                                >
                                    <div className="absolute top-0 right-0 p-3">
                                        <BookOpen className="h-4 w-4 opacity-20" />
                                    </div>

                                    <div className="flex flex-col h-full justify-between">
                                        <h3 className="text-sm font-black whitespace-normal line-clamp-2 leading-snug">{set.title}</h3>
                                        <div className="space-y-2">
                                            <div className="h-0.5 w-12 bg-primary/30 rounded-full" />
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{set.cards_count || 0} Flashcards</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-44 w-full flex items-center justify-center border-2 border-dashed rounded-3xl opacity-50">
                                <p className="text-xs font-bold uppercase tracking-widest">No sets found</p>
                            </div>
                        )}
                    </div>
                    <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
            </div>

            {/* Risk Analysis */}
            <div className="px-1">
                {riskData && (
                    <StudyRiskScore
                        score={riskData.score}
                        trend={riskData.trend}
                        lastUpdated={new Date().toLocaleDateString()}
                    />
                )}
            </div>
        </div>
    );
};

export default DashboardMobile;
