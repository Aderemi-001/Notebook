
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { studySetService, StudySet } from '@/services/studySetService';
import DashboardStats from '@/components/dashboard/DashboardStats';
import SmartStudySuggestions from '@/components/dashboard/SmartStudySuggestions';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, Plus, LayoutDashboard, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';

const DashboardWeb: React.FC = () => {
    const { user, profile, loading: isLoadingAuth } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const { t } = useLanguage();

    const { data: studySets, isLoading } = useQuery<StudySet[], Error>({
        queryKey: ['studySets', user?.id],
        queryFn: studySetService.getMyStudySets,
        enabled: !!user && !isLoadingAuth,
    });

    const filteredStudySets = studySets?.filter(set =>
        set.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        set.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoadingAuth) {
        return (
            <div className="container mx-auto py-8 sm:py-12 space-y-8">
                <Skeleton className="h-32 w-full rounded-3xl" />
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto space-y-10 animate-fade-in custom-scrollbar pt-6">
            {/* High-Impact Welcome Hero */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-950 p-8 sm:p-12 text-white shadow-2xl">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-[100px]" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-60 w-60 rounded-full bg-violet-500/20 blur-[80px]" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-indigo-200 text-xs font-bold uppercase tracking-widest">
                            <LayoutDashboard className="h-3 w-3" />
                            Personal Learning Hub
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            {t('dashboard.welcome')} <span className="text-nova-blue animate-pulse-glow">
                                {profile?.display_name || user?.email?.split('@')[0] || 'Scholar'}
                            </span>{t('dashboard.welcomeSuffix')}
                        </h1>
                        <p className="text-indigo-100/80 text-lg md:text-xl font-medium max-w-lg">
                            {t('dashboard.subtitle')}
                        </p>
                    </div>

                    <Button
                        size="lg"
                        onClick={() => navigate('/create')}
                        className="bg-white text-indigo-900 hover:bg-indigo-50 shadow-xl hover:shadow-indigo-500/20 px-8 py-7 rounded-2xl font-bold text-lg transition-all active:scale-95 group"
                    >
                        <Plus className="h-6 w-6 mr-2 transition-transform group-hover:rotate-90" />
                        {t('dashboard.createSet')}
                    </Button>
                </div>
            </div>

            {/* Global Stats Dashboard Component */}
            <DashboardStats />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Secondary Sidebar Content */}
                <div className="lg:col-span-4 space-y-8 order-2 lg:order-1">
                    <SmartStudySuggestions layout="compact" />
                    <RecentActivity />
                </div>

                {/* Primary Column: Study Sets List */}
                <div className="lg:col-span-8 space-y-6 order-1 lg:order-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            {t('dashboard.myLibrary')}
                        </h2>

                        <div className="relative w-full sm:w-72 group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <Input
                                placeholder={t('dashboard.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 pr-4 py-6 rounded-2xl bg-white/80 dark:bg-white/5 border-input hover:border-primary/50 focus:border-primary focus:ring-primary/20 transition-all text-base backdrop-blur-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                            </div>
                        ) : filteredStudySets && filteredStudySets.length > 0 ? (
                            <>
                                {filteredStudySets.slice(0, 6).map((set) => (
                                    <div
                                        key={set.id}
                                        onClick={() => navigate(`/sets/${set.id}`)}
                                        className="premium-card p-6 flex items-center justify-between group cursor-pointer hover:border-primary/40"
                                    >
                                        <div className="flex items-center gap-5 min-w-0">
                                            <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-500/20 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                                                <BookOpen className="h-7 w-7" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">{set.title}</h3>
                                                {set.description ? (
                                                    <p className="text-sm text-muted-foreground truncate font-medium">
                                                        {set.description}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground italic font-medium">{t('dashboard.noDescription')}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 ml-4">
                                            <div className="hidden sm:flex flex-col items-end">
                                                <span className="text-lg font-black">{set.cards_count || 0}</span>
                                                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground transition-colors group-hover:text-primary/70">{t('dashboard.flashcards')}</span>
                                            </div>
                                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-accent opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                                                <Plus className="h-5 w-5 text-primary rotate-45" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredStudySets.length > 6 && (
                                    <Button
                                        variant="ghost"
                                        className="w-full h-14 rounded-2xl text-lg font-bold hover:bg-primary/5 hover:text-primary transition-all gap-2"
                                        onClick={() => navigate('/sets')}
                                    >
                                        {t('dashboard.exploreAll')} {filteredStudySets.length} {t('dashboard.sets')}
                                        <TrendingUp className="h-5 w-5" />
                                    </Button>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-20 px-6 premium-card border-dashed border-2 flex flex-col items-center">
                                <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center mb-6">
                                    <Plus className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">
                                    {searchQuery ? t('dashboard.noMatches') : t('dashboard.noSetsTitle')}
                                </h3>
                                <p className="text-muted-foreground max-w-xs mb-8">
                                    {searchQuery
                                        ? t('dashboard.tryAgain')
                                        : t('dashboard.noSetsDesc')}
                                </p>
                                {!searchQuery && (
                                    <Button
                                        size="lg"
                                        onClick={() => navigate('/create')}
                                        className="rounded-xl px-10"
                                    >
                                        {t('dashboard.getStarted')}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardWeb;
