
import { supabase } from "@/integrations/supabase/client";
import { showSuccess } from "@/utils/toast";

export const gamificationService = {

    /**
     * Checks if the user's study streak should be incremented.
     * Call this whenever a user completes a significant study action (e.g., finishes a set, a daily review session).
     */
    async checkAndIncrementStreak(userId: string) {
        if (!userId) return;

        try {
            // 1. Get current streak info
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('current_streak, last_study_date, longest_streak')
                .eq('id', userId)
                .single();

            if (error || !profile) return; // Silent fail

            const today = new Date().toISOString().split('T')[0];
            const lastStudyDate = profile.last_study_date;

            // If already studied today, do nothing
            if (lastStudyDate === today) {
                return;
            }

            let newStreak = 1;

            if (lastStudyDate) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                if (lastStudyDate === yesterdayStr) {
                    // Studied yesterday -> Increment streak
                    newStreak = (profile.current_streak || 0) + 1;
                } else {
                    // Missed a day -> Reset to 1
                    newStreak = 1;
                }
            } else {
                // First time studying
                newStreak = 1;
            }

            // Update Max Streak if needed
            const newLongest = Math.max(newStreak, profile.longest_streak || 0);

            // 2. Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    current_streak: newStreak,
                    longest_streak: newLongest,
                    last_study_date: today
                })
                .eq('id', userId);

            if (!updateError) {
                // Return status to UI to maybe show a celebration
                if (newStreak > (profile.current_streak || 0)) {
                    // Celebration logic could go here or trigger a toast in the consuming component
                    if (newStreak % 5 === 0) {
                        showSuccess(`🔥 ${newStreak} Day Streak! Keep it up!`);
                    } else if (newStreak === 1 && (profile.current_streak || 0) > 0) {
                        // User lost streak but restarted
                        showSuccess(`🔥 Streak Restarted! Day 1.`);
                    } else {
                        // Standard update
                        // showSuccess("🔥 Streak Updated!");
                    }
                }
            }

        } catch (e) {
            console.error("Error updating streak:", e);
        }
    },

    /**
     * Fetches the user's current streak stats
     */
    async getStreakStats(userId: string) {
        const { data } = await supabase
            .from('profiles')
            .select('current_streak, longest_streak')
            .eq('id', userId)
            .single();

        return data || { current_streak: 0, longest_streak: 0 };
    },

    /**
     * getBadges
     * Returns all badges, with an 'awarded_at' field if the user has unlocked them.
     */
    async getBadges(userId: string) {
        if (!userId) return [];

        try {
            // 1. Fetch all available badges
            const { data: allBadges, error: badgesError } = await supabase
                .from('badges')
                .select('*')
                .order('category', { ascending: true }); // Groups by category naturally

            if (badgesError) throw badgesError;

            // 2. Fetch user's unlocked badges
            const { data: userBadges, error: userBadgesError } = await supabase
                .from('user_badges')
                .select('badge_id, awarded_at')
                .eq('user_id', userId);

            if (userBadgesError) throw userBadgesError;

            // 3. Merge data
            const unlockedMap = new Map(userBadges.map(ub => [ub.badge_id, ub.awarded_at]));

            return allBadges.map(badge => ({
                ...badge,
                awarded_at: unlockedMap.get(badge.id) || null
            }));

        } catch (e) {
            console.error("Error fetching badges:", e);
            return [];
        }
    }
};
