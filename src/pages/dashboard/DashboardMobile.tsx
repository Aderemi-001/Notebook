import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAIFocus } from '@/hooks/use-ai-focus';
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
    ArrowRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';

const DashboardMobile: React.FC = () => {
    const { user, profile, loading: isLoadingAuth } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();

    const { data: studySets, isLoading } = useQuery<StudySet[], Error>({
        queryKey: ['studySets', user?.id],
        queryFn: studySetService.getMyStudySets,
        enabled: !!user && !isLoadingAuth,
    });

    // Fetch dashboard stats
    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats-mobile', user?.id],
        queryFn: async () => {
            if (!user) return null;

            // Total Sets Mastered (sets with high mastery)
            // Sets Mastered Logic: 
            // We count a set as mastered if the user has mastered >90% of the cards in it.
            // We consider ALL sets the user has studied, not just ones they created.

            // 1. Get all progress entries with card->set relationship
            const { data: progressEntries } = await supabase
                .from('user_progress')
                .select('card_id, status, repetition_level, cards(set_id)')
                .eq('user_id', user.id);

            let setsMastered = 0;

            if (progressEntries && progressEntries.length > 0) {
                // Group by set_id from cards relationship
                const setProgress: Record<string, { total: number, mastered: number }> = {};

                progressEntries.forEach(p => {
                    const cardData = p.cards as any;
                    const setId = cardData?.set_id;
                    if (!setId) return;
                    if (!setProgress[setId]) setProgress[setId] = { total: 0, mastered: 0 };

                    setProgress[setId].total++; // Total CARDS studied in this set

                    if (p.status === 'mastered' || (p.repetition_level || 0) >= 4) {
                        setProgress[setId].mastered++;
                    }
                });

                const setIds = Object.keys(setProgress);

                if (setIds.length > 0) {
                    // 2. Count cards per set

                    // Count cards per set
                    const cardCounts = await Promise.all(setIds.map(async (setId) => {
                        const { count } = await supabase
                            .from('cards')
                            .select('*', { count: 'exact', head: true })
                            .eq('set_id', setId);
                        return { setId, count: count || 0 };
                    }));

                    cardCounts.forEach(({ setId, count: totalCards }) => {
                        const progress = setProgress[setId];
                        if (!progress) return;

                        if (totalCards > 0) {
                            const rate = progress.mastered / totalCards;
                            if (rate >= 0.80) setsMastered++;
                        }
                    });
                }
            }

            // Concept Gems (total concepts created)
            const { count: conceptCount } = await supabase
                .from('concepts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            // Mastery Rate
            const { data: progressData } = await supabase
                .from('user_progress')
                .select('repetition_level, status')
                .eq('user_id', user.id);

            const masteredCount = progressData?.filter(p => p.status === 'mastered' || (p.repetition_level || 0) >= 4).length || 0;
            const totalCards = progressData?.length || 0;
            const masteryRate = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

            // Streak (consecutive days with reviews)
            // Streak - fetched directly from profiles (optimized)
            const { data: profileStats } = await supabase
                .from('profiles')
                .select('current_streak')
                .eq('id', user.id)
                .single();

            const streak = profileStats?.current_streak || 0;

            return {
                setsMastered,
                conceptGems: conceptCount || 0,
                masteryRate,
                streak
            };
        },
        enabled: !!user,
    });

    if (isLoadingAuth) {
        return (
            <div className="space-y-6 pb-20">
                <Skeleton className="h-48 w-full rounded-[2.5rem]" />
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-40 shrink-0 rounded-2xl" />)}
                </div>
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    // Format concept gems (e.g., 1200 -> 1.2k)
    const formatNumber = (num: number) => {
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}k`;
        }
        return num.toString();
    };

    return (
        <div className="flex flex-col gap-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Native-style Welcome Header */}
            <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                            {(() => {
                                const hour = new Date().getHours();
                                if (hour < 12) return 'Good Morning';
                                if (hour < 18) return 'Good Afternoon';
                                return 'Good Evening';
                            })()} Scholar
                        </p>
                        <h1 className="text-3xl font-black tracking-tighter">
                            {profile?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
                        </h1>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                        <div className="h-12 w-12 rounded-2xl border-2 border-primary/20 bg-background/50 backdrop-blur-xl flex items-center justify-center p-0.5">
                            <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} className="rounded-xl w-full h-full" alt="Avatar" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mastery Score / Stats - Compact Mobile View */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-950 p-6 text-white shadow-2xl">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <Badge className="bg-white/10 text-indigo-200 border-white/10 py-1.5 px-3 rounded-full text-[10px] font-black tracking-[0.1em]">
                            {t('dashboard.studyStreak')}: {stats?.streak || 0} {stats?.streak === 1 ? 'DAY' : 'DAYS'}
                        </Badge>
                        <Sparkles className="h-5 w-5 text-nova-blue" />
                    </div>

                    <div>
                        <p className="text-4xl font-black tracking-tighter mb-1">{stats?.masteryRate || 0}%</p>
                        <p className="text-xs font-bold text-indigo-200/60 uppercase tracking-widest">{t('dashboard.masteryLevel')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                            <p className="text-lg font-black">{formatNumber(stats?.conceptGems || 0)}</p>
                            <p className="text-[10px] text-indigo-200/50 uppercase font-bold tracking-wider">Concept Gems</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                            <p className="text-lg font-black">{stats?.setsMastered || 0}</p>
                            <p className="text-[10px] text-indigo-200/50 uppercase font-bold tracking-wider">Sets Mastered</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Horizontal Feed */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                        {t('dashboard.quickAccess')}
                    </h2>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {[
                        { icon: Plus, label: t('sidebar.createSet'), path: '/create', color: 'bg-indigo-500' },
                        { icon: Brain, label: 'Learn', path: '/explore-public-sets', color: 'bg-purple-500' },
                        { icon: History, label: 'Review', path: '/daily-review', color: 'bg-pink-500' },
                        { icon: TrendingUp, label: 'Mastery', path: '/dashboard', color: 'bg-emerald-500' },
                    ].map((btn, idx) => (
                        <button
                            key={idx}
                            onClick={() => navigate(btn.path)}
                            className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
                        >
                            <div className={`h-14 w-14 ${btn.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                                <btn.icon className="h-6 w-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis w-full px-1">{btn.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent Packs - Horizontal Scroll */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-black tracking-tight">{t('dashboard.yourLibrary')}</h2>
                    <Button variant="ghost" size="sm" className="text-primary font-bold active:scale-95" onClick={() => navigate('/sets')}>
                        {t('dashboard.seeAll')}
                    </Button>
                </div>

                <ScrollArea className="w-full whitespace-nowrap overflow-visible">
                    <div className="flex space-x-4 pb-4">
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
                                        <BookOpen className="h-4 w-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                                    </div>

                                    <div className="flex flex-col h-full justify-between">
                                        <h3 className="text-sm font-black whitespace-normal line-clamp-2 leading-snug">{set.title}</h3>
                                        <div className="space-y-2">
                                            <div className="h-0.5 w-12 bg-primary/30 rounded-full" />
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">{set.cards_count || 0} {t('dashboard.flashcards')}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-44 w-full flex items-center justify-center border-2 border-dashed rounded-3xl opacity-50">
                                <p className="text-xs font-bold uppercase tracking-widest">{t('dashboard.noSetsTitle')}</p>
                            </div>
                        )}
                    </div>
                    <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
            </div>

            {/* Intelligence Card - AI Suggestions */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        {t('dashboard.aiFocus')}
                    </h2>
                </div>

                <AIFocusWidget />
            </div>
        </div>
    );
};

const AIFocusWidget = () => {
    const { t } = useLanguage();
    const { data: focus, isLoading } = useAIFocus();
    const navigate = useNavigate();

    // If loading, show skeleton
    if (isLoading) {
        return (
            <div className="premium-card p-6 border-indigo-500/30 bg-indigo-500/5 h-44 animate-pulse">
                <div className="h-6 w-3/4 bg-indigo-500/10 rounded mb-4"></div>
                <div className="h-4 w-full bg-indigo-500/5 rounded mb-2"></div>
                <div className="h-12 w-full bg-indigo-500/10 rounded mt-6"></div>
            </div>
        );
    }

    // If no focus data (user is doing great or new), show proactive message
    if (!focus) {
        return (
            <div className="premium-card p-6 border-indigo-500/30 bg-indigo-500/5 overflow-hidden relative group">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 h-24 w-24 bg-indigo-500/10 blur-2xl rounded-full" />
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="space-y-1">
                        <h3 className="font-black text-lg">Ready to Excel?</h3>
                        <p className="text-xs text-muted-foreground font-medium">
                            You're all caught up! Explore new topics or take a mastery exam to challenge yourself.
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate('/explore-public-sets')}
                        className="rounded-2xl bg-indigo-500 hover:bg-indigo-600 font-bold w-full h-12 flex items-center justify-between px-6 active:scale-95 transition-transform shadow-lg shadow-indigo-500/20"
                    >
                        Explore Library
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    // Dynamic content based on reason
    const title = focus.reason === 'weakness' ? 'Focus Area Detected' : 'Review Due';
    const description = focus.reason === 'weakness'
        ? `You struggled with "${focus.term}" recently. Let's strengthen this memory.`
        : `It's time to review "${focus.term}" to keep your streak alive.`;

    const buttonText = focus.reason === 'weakness' ? t('dashboard.startRecovery') : 'Start Review';

    return (
        <div className="premium-card p-6 border-indigo-500/30 bg-indigo-500/5 overflow-hidden relative group">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-24 w-24 bg-indigo-500/10 blur-2xl rounded-full" />
            <div className="relative z-10 flex flex-col gap-4">
                <div className="space-y-1">
                    <h3 className="font-black text-lg">{title}</h3>
                    <p className="text-xs text-muted-foreground font-medium">
                        {description}
                    </p>
                </div>
                <Button
                    onClick={() => navigate(`/sets/${focus.setId}/study`)}
                    className="rounded-2xl bg-indigo-500 hover:bg-indigo-600 font-bold w-full h-12 flex items-center justify-between px-6 active:scale-95 transition-transform shadow-lg shadow-indigo-500/20"
                >
                    {buttonText}
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};


export default DashboardMobile;
