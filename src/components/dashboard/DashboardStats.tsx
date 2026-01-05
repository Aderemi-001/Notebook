import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Target, Flame, TrendingUp, Loader2 } from "lucide-react";

interface DashboardStatsProps {
    className?: string;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ className }) => {
    const { user } = useAuth();

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
                .select('repetition_level')
                .eq('user_id', user.id);

            const masteredCount = progressData?.filter(p => (p.repetition_level || 0) >= 4).length || 0;
            const totalCards = progressData?.length || 0;
            const masteryRate = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

            // Streak (simplified - count consecutive days with reviews)
            const { data: recentReviews } = await supabase
                .from('user_progress')
                .select('last_reviewed_at')
                .eq('user_id', user.id)
                .order('last_reviewed_at', { ascending: false })
                .limit(30);

            let streak = 0;
            if (recentReviews && recentReviews.length > 0) {
                const dates = new Set(
                    recentReviews.map(r => new Date(r.last_reviewed_at).toISOString().split('T')[0])
                );
                const sortedDates = Array.from(dates).sort().reverse();

                let currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0);

                for (const dateStr of sortedDates) {
                    const reviewDate = new Date(dateStr);
                    reviewDate.setHours(0, 0, 0, 0);

                    const diffDays = Math.floor((currentDate.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));

                    if (diffDays === streak) {
                        streak++;
                    } else {
                        break;
                    }
                }
            }

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
            color: "text-blue-600",
            bgColor: "bg-blue-50 dark:bg-blue-950"
        },
        {
            icon: Target,
            label: "Studied Today",
            value: stats?.cardsToday || 0,
            suffix: " cards",
            color: "text-green-600",
            bgColor: "bg-green-50 dark:bg-green-950"
        },
        {
            icon: Flame,
            label: "Day Streak",
            value: stats?.streak || 0,
            suffix: stats?.streak === 1 ? " day" : " days",
            color: "text-orange-600",
            bgColor: "bg-orange-50 dark:bg-orange-950"
        },
        {
            icon: TrendingUp,
            label: "Mastery Rate",
            value: stats?.masteryRate || 0,
            suffix: "%",
            color: "text-purple-600",
            bgColor: "bg-purple-50 dark:bg-purple-950"
        }
    ];

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
            {statCards.map((stat, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                    {stat.label}
                                </p>
                                <p className="text-3xl font-bold">
                                    {stat.value}
                                    {stat.suffix && <span className="text-lg text-muted-foreground ml-1">{stat.suffix}</span>}
                                </p>
                            </div>
                            <div className={`p-3 rounded-full ${stat.bgColor}`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default DashboardStats;
