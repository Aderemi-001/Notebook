
import { supabase } from "@/integrations/supabase/client";
import { showSuccess } from "@/utils/toast";
import { handleSafeAction } from "@/utils/safe-action";
import confetti from 'canvas-confetti';


export const gamificationService = {

    /**
     * Checks if the user's study streak should be incremented.
     * Call this whenever a user completes a significant study action (e.g., finishes a set, a daily review session).
     */
    async checkAndIncrementStreak(userId: string) {
        if (!userId) return;

        return handleSafeAction(async () => {
            // 1. Get current streak info
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('current_streak, last_study_date, longest_streak')
                .eq('id', userId)
                .maybeSingle();

            if (error || !profile) return; // Silent fail if not exist

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

            if (updateError) throw updateError;

            // Celebration logic
            if (newStreak % 5 === 0) {
                showSuccess(`🔥 ${newStreak} Day Streak! Keep it up!`);
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#6366f1', '#a855f7', '#ec4899']
                });
            } else if (newStreak === 1 && (profile.current_streak || 0) > 0) {
                showSuccess(`🔥 Streak Restarted! Day 1.`);
            }

        }, "Error updating your progress streak");
    },

    /**
     * Fetches the user's current streak stats
     */
    async getStreakStats(userId: string) {
        const { data } = await supabase
            .from('profiles')
            .select('current_streak, longest_streak')
            .eq('id', userId)
            .maybeSingle();

        return data || { current_streak: 0, longest_streak: 0 };
    },

    /**
     * getBadges
     * Returns all badges, with an 'awarded_at' field if the user has unlocked them.
     */
    async getBadges(userId: string) {
        if (!userId) return [];

        return handleSafeAction(async () => {
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
            const unlockedMap = new Map((userBadges || []).map((ub: any) => [ub.badge_id, ub.awarded_at]));

            return allBadges.map(badge => ({
                ...badge,
                awarded_at: unlockedMap.get(badge.id) || null
            }));
        }, "Failed to load achievements", []) as Promise<any[]>;
    },

    /**
     * Syncs client-side rules to the database.
     * Ensures that if a user qualifies for a badge, it is permanently awarded in the DB.
     */
    async syncBadges(userId: string, profile: any, isPremium: boolean, planId?: string | null) {
        if (!userId || !profile) return;

        try {
            const earnedSlugs: string[] = [];

            // Check each static badge rule
            STATIC_GOAL_BADGES.forEach(badge => {
                const normalizedSlug = (badge.slug || '').replace(/[_\s]/g, '-').toLowerCase();
                const rule = BADGE_RULES[normalizedSlug];

                if (rule && rule(profile, isPremium, planId)) {
                    earnedSlugs.push(badge.slug);
                }
            });

            if (earnedSlugs.length === 0) return;

            // Update badges in DB
            for (const slug of earnedSlugs) {
                const badgeDef = STATIC_GOAL_BADGES.find(b => b.slug === slug);
                if (!badgeDef) continue;

                // 1. Get or Create Badge from static definition
                const { data: badgeData } = await supabase
                    .from('badges')
                    .select('id')
                    .eq('slug', slug)
                    .maybeSingle();

                let badgeId = badgeData?.id;

                if (!badgeId) {
                    const { data: newBadge, error: createError } = await supabase
                        .from('badges')
                        .insert({
                            slug: badgeDef.slug,
                            name: badgeDef.name,
                            description: badgeDef.description,
                            icon_name: badgeDef.icon_name,
                            category: badgeDef.category
                        })
                        .select('id')
                        .single();

                    if (!createError) {
                        badgeId = newBadge?.id;
                    } else {
                        // Retry pick up if insert failed due to race condition
                        const { data: retry } = await supabase.from('badges').select('id').eq('slug', slug).maybeSingle();
                        badgeId = retry?.id;
                    }
                }

                if (badgeId) {
                    // 2. Award to User (ignore error if already exists)
                    await supabase
                        .from('user_badges')
                        .insert({
                            user_id: userId,
                            badge_id: badgeId,
                            awarded_at: new Date().toISOString()
                        })
                        .select(); // No .match() on insert
                }
            }
        } catch (e) {
            console.error("Error syncing badges:", e);
        }
    },

    /**
     * Process badges list to apply virtual rules and handle duplicates
     */
    enrichBadges(badges: any[], profile: any, isPremium: boolean, planId?: string | null) {
        if (!badges || !profile) return badges || [];

        const nowISO = new Date().toISOString();

        // Legacy slugs to exclude
        const LEGACY_SLUGS = ['master-10', 'master-25', 'master-50', 'mastery-10', 'mastery-25', 'mastery-50', 'master-100', 'mastery-100', 'sharp-shooter'];

        // Start with DB badges
        let finalBadges = [...badges].filter(b => !LEGACY_SLUGS.includes(b.slug));

        // Add static goal badges if not already present by slug
        STATIC_GOAL_BADGES.forEach(goal => {
            if (!finalBadges.some(fb => fb.slug === goal.slug)) {
                finalBadges.push({
                    ...goal,
                    awarded_at: undefined
                });
            }
        });

        // Apply Rules to all badges (virtual unlock)
        const enriched = finalBadges.map(b => {
            if (b.awarded_at) return b;

            const normalizedSlug = (b.slug || '').replace(/[_\s]/g, '-').toLowerCase();
            const rule = BADGE_RULES[normalizedSlug];

            if (rule && rule(profile, isPremium, planId)) {
                return { ...b, awarded_at: nowISO };
            }
            return b;
        });

        // DE-DUPLICATION: Remove duplicates by icon+category
        // Note: For streaks/mastery, we usually want to see all milestones.
        // We only de-duplicate if slugs or identities are truly redundant.
        const uniqueMap = new Map();
        enriched.forEach(badge => {
            // We use SLUG as the primary key for uniqueness now to avoid icon collisions between milestones
            const key = badge.slug;
            const existing = uniqueMap.get(key);

            if (!existing || (!!badge.awarded_at && !existing.awarded_at)) {
                uniqueMap.set(key, badge);
            }
        });

        return Array.from(uniqueMap.values());
    }
};

// --- SHARED CONSTANTS ---

// Define Rules
const BADGE_RULES: Record<string, (p: any, isPremium?: boolean, planId?: string | null) => boolean> = {
    // PRO
    'pro-member': (_p, isPremium) => !!isPremium,
    'founding-member': (_p, _isPremium, planId) => planId === 'pro-lifetime',

    // STREAKS
    'streak-starter': (p) => (p.current_streak || 0) >= 3,
    'streak-7': (p) => (p.current_streak || 0) >= 7,
    'week-warrior': (p) => (p.current_streak || 0) >= 14,
    'monthly-master': (p) => (p.current_streak || 0) >= 30,

    // CREATION
    'first-step': (p) => (p.stats?.total_sets || 0) >= 1,
    'set-builder': (p) => (p.stats?.total_sets || 0) >= 5,
    'sets-10': (p) => (p.stats?.total_sets || 0) >= 10,

    // MASTERY
    'recall-rookie': (p) => {
        const mastered = p.stats?.mastered_cards ?? p.stats?.total_mastered_cards ?? 0;
        return Number(mastered) >= 10;
    },
    'mastermind': (p) => {
        const mastered = p.stats?.mastered_cards ?? p.stats?.total_mastered_cards ?? 0;
        return Number(mastered) >= 50;
    },
    'memory-maestro': (p) => {
        const mastered = p.stats?.mastered_cards ?? p.stats?.total_mastered_cards ?? 0;
        return Number(mastered) >= 100;
    },
    'knowledge-keeper': (p) => {
        const mastered = p.stats?.mastered_cards ?? p.stats?.total_mastered_cards ?? 0;
        return Number(mastered) >= 250;
    },
    'wisdom-warden': (p) => {
        const mastered = p.stats?.mastered_cards ?? p.stats?.total_mastered_cards ?? 0;
        return Number(mastered) >= 500;
    },
    'titan-1000': (p) => {
        const mastered = p.stats?.mastered_cards ?? p.stats?.total_mastered_cards ?? 0;
        return Number(mastered) >= 1000;
    },
};

// Static data for all badges we support
const STATIC_GOAL_BADGES = [
    { id: 'goal-streak-3', slug: 'streak-starter', name: 'Streak Starter', description: 'Reach a 3-day study streak', icon_name: 'trophy', category: 'streak' },
    { id: 'goal-streak-7', slug: 'streak-7', name: '7 Day Streak', description: 'Study for 7 days in a row', icon_name: 'flame', category: 'streak' },
    { id: 'goal-streak-14', slug: 'week-warrior', name: 'Week Warrior', description: 'Maintain a 14-day streak', icon_name: 'crown', category: 'streak' },
    { id: 'goal-streak-30', slug: 'monthly-master', name: 'Monthly Master', description: 'Maintain a 30-day streak', icon_name: 'zap', category: 'streak' },

    { id: 'goal-sets-1', slug: 'first-step', name: 'First Step', description: 'Create your first Study Set', icon_name: 'pen-tool', category: 'creation' },
    { id: 'goal-sets-5', slug: 'set-builder', name: 'Set Builder', description: 'Create 5 Study Sets', icon_name: 'library', category: 'creation' },
    { id: 'goal-sets-10', slug: 'sets-10', name: 'Set Architect', description: 'Create 10 Study Sets', icon_name: 'award', category: 'creation' },

    { id: 'goal-master-10', slug: 'recall-rookie', name: 'Recall Rookie', description: 'Master 10 Cards', icon_name: 'brain', category: 'mastery' },
    { id: 'goal-master-50', slug: 'mastermind', name: 'Mastermind', description: 'Master 50 Cards', icon_name: 'sparkles', category: 'mastery' },
    { id: 'goal-master-100', slug: 'memory-maestro', name: 'Memory Maestro', description: 'Master 100 Cards', icon_name: 'graduation-cap', category: 'mastery' },
    { id: 'goal-knowledge-250', slug: 'knowledge-keeper', name: 'Knowledge Keeper', description: 'Master 250 Cards', icon_name: 'award', category: 'mastery' },
    { id: 'goal-wisdom-500', slug: 'wisdom-warden', name: 'Wisdom Warden', description: 'Master 500 Cards', icon_name: 'book-open', category: 'mastery' },
    { id: 'goal-titan-1000', slug: 'titan-1000', name: 'Titan', description: 'Master 1000 Cards', icon_name: 'gem', category: 'mastery' },

    { id: 'goal-pro', slug: 'pro-member', name: 'Pro Member', description: 'Support the project with a Pro subscription', icon_name: 'crown', category: 'general' },
    { id: 'goal-founding', slug: 'founding-member', name: 'Founding Member', description: 'Early supporter with Lifetime Access', icon_name: 'star', category: 'general' },
];
