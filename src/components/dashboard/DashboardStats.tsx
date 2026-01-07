import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Target, Flame, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStatsProps {
    className?: string;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ className }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Fetch all stats in parallel
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats', user?.id],
        queryFn: async () => {
            if (!user) return null;

            // Total Sets
            const { count: totalSets } = await supabase
                .from('study_sets')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            // Cards Studied Today
            const today = new Date().toISOString().split('T')[0];
            const { count: cardsToday } = await supabase
                .from('user_progress')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('last_reviewed_at', `${today}T00:00:00`)
                .lte('last_reviewed_at', `${today}T23:59:59`);

            // Mastery Rate
            const { data: progressData } = await supabase
                .from('user_progress')
                .select('repetition_level, status')
                .eq('user_id', user.id);

            // Count as mastered if status is 'mastered' OR repetition_level >= 4 (fallback)
            const masteredCount = progressData?.filter(p => p.status === 'mastered' || (p.repetition_level || 0) >= 4).length || 0;
            const totalCards = progressData?.length || 0;
            const masteryRate = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

            // Streak - fetched directly from profiles (optimized)
            const { data: profileStats } = await supabase
                .from('profiles')
                .select('current_streak')
                .eq('id', user.id)
                .single();

            const streak = profileStats?.current_streak || 0;

            return {
                totalSets: totalSets || 0,
                cardsToday: cardsToday || 0,
                streak,
                masteryRate
            };
        },
        enabled: !!user,
    });

    if (isLoading) {
        return (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
                {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                            <div className="h-16 bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const statCards = [
        {
            icon: BookOpen,
            label: "Study Sets",
            value: stats?.totalSets || 0,
            color: "text-indigo-600 dark:text-indigo-400",
            bgColor: "bg-indigo-50 dark:bg-indigo-500/10",
            borderColor: "border-indigo-100 dark:border-indigo-500/20"
        },
        {
            icon: Target,
            label: "Studied Today",
            value: stats?.cardsToday || 0,
            suffix: " cards",
            color: "text-emerald-600 dark:text-emerald-400",
            bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
            borderColor: "border-emerald-100 dark:border-emerald-500/20"
        },
        {
            icon: Flame,
            label: "Day Streak",
            value: stats?.streak || 0,
            suffix: stats?.streak === 1 ? " day" : " days",
            color: "text-orange-600 dark:text-orange-400",
            bgColor: "bg-orange-50 dark:bg-orange-500/10",
            borderColor: "border-orange-100 dark:border-orange-500/20",
            animate: ""
        },
        {
            icon: TrendingUp,
            label: "Mastery Rate",
            value: stats?.masteryRate || 0,
            suffix: "%",
            color: "text-violet-600 dark:text-violet-400",
            bgColor: "bg-violet-50 dark:bg-violet-500/10",
            borderColor: "border-violet-100 dark:border-violet-500/20"
        }
    ];

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 ${className}`}>
            {statCards.map((stat, index) => (
                <button
                    key={index}
                    onClick={() => {
                        if (stat.label === "Study Sets") navigate('/sets');
                        else if (stat.label === "Studied Today") navigate('/daily-review');
                        else navigate('/dashboard'); // Mastery Rate & Day Streak
                    }}
                    className={cn(
                        "premium-card p-6 flex items-center justify-between group overflow-hidden relative text-left w-full transition-all active:scale-[0.98] hover:shadow-lg",
                        stat.borderColor,
                        stat.animate
                    )}
                >
                    {/* Background Glow */}
                    <div className={cn(
                        "absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40",
                        stat.bgColor
                    )} />

                    <div className="relative z-10">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            {stat.label}
                        </p>
                        <p className="text-3xl font-black tracking-tight">
                            {stat.value}
                            {stat.suffix && <span className="text-sm font-medium text-muted-foreground ml-1">{stat.suffix}</span>}
                        </p>
                    </div>

                    <div className={cn(
                        "p-3.5 rounded-2xl relative z-10 transition-transform duration-500 group-hover:scale-110",
                        stat.bgColor
                    )}>
                        <stat.icon className={cn("h-6 w-6", stat.color)} />
                    </div>
                </button>
            ))}
        </div>
    );
};

export default DashboardStats;
