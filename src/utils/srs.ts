export interface UserProgress {
    repetition_level: number;
    ease_factor: number;
    next_review_at: string;
    status: 'learning' | 'mastered';
}

/**
 * Calculates the next review schedule based on the SuperMemo-2 (SM-2) algorithm.
 * @param currentProgress The user's current progress on the card (or null if new)
 * @param quality The quality of recall (0 = Again, 1 = Hard, 2 = Good)
 */
export const calculateNextReview = (
    currentProgress: UserProgress | null,
    quality: 0 | 1 | 2
): UserProgress => {
    let n = currentProgress?.repetition_level ?? 0;
    let EF = currentProgress?.ease_factor ?? 2.5;
    let I = 0;
    let status: 'learning' | 'mastered' = 'learning';

    if (quality === 0) { // Again
        n = 0;
        EF = Math.max(1.3, EF - 0.20);
        I = 0; // Immediately
    } else if (quality === 1) { // Hard
        n = 0; // Reset repetition level
        EF = Math.max(1.3, EF - 0.15); // Slightly less severe decrease
        I = 1; // 1 day
    } else { // quality === 2 (Good)
        n += 1;
        EF = EF + 0.1; // Simple increase for good recall
        EF = Math.max(1.3, EF); // Ensure EF doesn't go below 1.3

        if (n === 1) {
            I = 1; // First successful recall, 1 day
        } else if (n === 2) {
            I = 6; // Second successful recall, 6 days
        } else {
            I = Math.round(6 * Math.pow(EF, n - 2)); // Standard SM-2 for subsequent recalls
        }
        status = 'mastered'; // Mark as mastered if recalled well
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + I);

    return {
        repetition_level: n,
        ease_factor: parseFloat(EF.toFixed(2)),
        next_review_at: nextReviewDate.toISOString(),
        status: status,
    };
};
