import { supabase } from "@/integrations/supabase/client";
import { handleSafeAction } from "@/utils/safe-action";

export const analyticsService = {
    async getMasteryActivity(user_id: string): Promise<{ date: string, count: number }[]> {
        return handleSafeAction(async () => {
            // We'll use the user_progress table to see when items were mastered
            const { data, error } = await supabase
                .from('user_progress')
                .select('last_reviewed_at, repetition_level')
                .eq('user_id', user_id)
                .gte('repetition_level', 4) // Assuming 4 is mastered
                .gte('last_reviewed_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days

            if (error) throw error;

            // Group by date
            const activity: Record<string, number> = {};
            data?.forEach(item => {
                const dateData = item.last_reviewed_at || new Date().toISOString();
                const date = new Date(dateData).toISOString().split('T')[0];
                activity[date] = (activity[date] || 0) + 1;
            });

            return Object.entries(activity).map(([date, count]) => ({ date, count }));
        }, "Failed to load activity data", []) as Promise<{ date: string, count: number }[]>;
    },

    async getStudyRiskScore(user_id: string): Promise<{ score: number, trend: 'improving' | 'declining' | 'stable' }> {
        return handleSafeAction(async () => {
            // Calculate a risk score based on:
            // 1. Due items backlog
            // 2. Average mastery level
            // 3. Last study date

            const { data: progress, error } = await supabase
                .from('user_progress')
                .select('next_review_at, repetition_level, last_reviewed_at')
                .eq('user_id', user_id);

            if (error) throw error;
            if (!progress || progress.length === 0) return { score: 0, trend: 'stable' };

            const now = new Date();
            const dueItems = progress.filter(p => p.next_review_at && new Date(p.next_review_at) < now).length;
            const totalItems = progress.length;

            // Risk increases with due items and low mastery
            const backlogRisk = (dueItems / totalItems) * 70; // Max 70% risk from backlog
            const avgMastery = progress.reduce((acc, p) => acc + (p.repetition_level || 0), 0) / totalItems;
            const masteryRisk = (1 - (avgMastery / 5)) * 30; // Max 30% risk from low mastery (assuming 5 is max)

            const score = Math.min(100, Math.round(backlogRisk + masteryRisk));

            // Determine trend (simplified: compare with items updated in last 7 days)
            const recentlyUpdated = progress.filter(p => p.last_reviewed_at && new Date(p.last_reviewed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
            const trend = recentlyUpdated > (totalItems * 0.2) ? 'improving' : recentlyUpdated < (totalItems * 0.05) ? 'declining' : 'stable';

            return { score, trend };
        }, "Failed to calculate risk score", { score: 0, trend: 'stable' }) as Promise<{ score: number, trend: 'improving' | 'declining' | 'stable' }>;
    }
};
