/**
 * NovaMemory.ts
 * 
 * Spaced Repetition Intelligence using SM-2 Algorithm
 * Tracks user performance and predicts optimal review times
 */

import { supabase } from '@/integrations/supabase/client';

export interface SM2Result {
    easiness_factor: number;
    interval_days: number;
    repetitions: number;
    next_review: Date;
}

export class NovaMemory {

    /**
     * SM-2 Algorithm Implementation
     * @param quality - User rating: 0 (complete blackout) to 5 (perfect recall)
     * @param currentEF - Current Easiness Factor (default 2.5)
     * @param currentInterval - Current interval in days
     * @param currentReps - Current repetition count
     */
    static calculateNextReview(
        quality: number,
        currentEF: number = 2.5,
        currentInterval: number = 0,
        currentReps: number = 0
    ): SM2Result {
        let easiness_factor = currentEF;
        let interval_days = currentInterval;
        let repetitions = currentReps;

        // Quality must be 0-5
        quality = Math.max(0, Math.min(5, quality));

        if (quality >= 3) {
            // Correct response
            if (repetitions === 0) {
                interval_days = 1;
            } else if (repetitions === 1) {
                interval_days = 6;
            } else {
                interval_days = Math.round(interval_days * easiness_factor);
            }

            repetitions++;

            // Update Easiness Factor
            easiness_factor = easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
            easiness_factor = Math.max(1.3, easiness_factor); // Minimum EF is 1.3
        } else {
            // Incorrect response - reset
            repetitions = 0;
            interval_days = 1;
            // EF stays the same or decreases slightly
            easiness_factor = Math.max(1.3, easiness_factor - 0.2);
        }

        const next_review = new Date();
        next_review.setDate(next_review.getDate() + interval_days);

        return {
            easiness_factor,
            interval_days,
            repetitions,
            next_review
        };
    }

    /**
     * Get cards due for review today
     */
    static async getCardsDueToday(userId: string): Promise<any[]> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('cards')
            .select('*, study_sets(id, title)')
            .eq('user_id', userId)
            .lte('next_review', today)
            .order('next_review', { ascending: true });

        if (error) {
            console.error('Error fetching due cards:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Update card performance after review
     */
    static async updateCardPerformance(cardId: string, quality: number): Promise<boolean> {
        // Fetch current card data
        const { data: card, error: fetchError } = await supabase
            .from('cards')
            .select('easiness_factor, interval_days, repetitions')
            .eq('id', cardId)
            .single();

        if (fetchError || !card) {
            console.error('Error fetching card:', fetchError);
            return false;
        }

        // Calculate new values
        const result = this.calculateNextReview(
            quality,
            card.easiness_factor || 2.5,
            card.interval_days || 0,
            card.repetitions || 0
        );

        // Update card
        const { error: updateError } = await supabase
            .from('cards')
            .update({
                easiness_factor: result.easiness_factor,
                interval_days: result.interval_days,
                repetitions: result.repetitions,
                next_review: result.next_review.toISOString().split('T')[0]
            })
            .eq('id', cardId);

        if (updateError) {
            console.error('Error updating card:', updateError);
            return false;
        }

        return true;
    }

    /**
     * Get study statistics for user
     */
    static async getStudyStats(userId: string): Promise<{
        total_cards: number;
        due_today: number;
        mastered: number; // EF > 2.5 and interval > 30 days
        learning: number; // repetitions < 3
    }> {
        const { data: allCards } = await supabase
            .from('cards')
            .select('easiness_factor, interval_days, repetitions, next_review')
            .eq('user_id', userId);

        if (!allCards) return { total_cards: 0, due_today: 0, mastered: 0, learning: 0 };

        const today = new Date().toISOString().split('T')[0];

        return {
            total_cards: allCards.length,
            due_today: allCards.filter(c => c.next_review && c.next_review <= today).length,
            mastered: allCards.filter(c => (c.easiness_factor || 2.5) > 2.5 && (c.interval_days || 0) > 30).length,
            learning: allCards.filter(c => (c.repetitions || 0) < 3).length
        };
    }
}
