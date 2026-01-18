import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Safely formats a distance to now, handling null, undefined, or invalid dates.
 * Returns a fallback string if the date is invalid.
 */
export const safeFormatDistanceToNow = (
    date: string | number | Date | null | undefined,
    options: { addSuffix?: boolean; fallback?: string } = {}
): string => {
    const { addSuffix = true, fallback = 'Recently' } = options;

    if (!date) return fallback;

    try {
        let dateObj: Date;

        if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string') {
            dateObj = parseISO(date);
        } else {
            dateObj = new Date(date);
        }

        if (!isValid(dateObj)) {
            return fallback;
        }

        return formatDistanceToNow(dateObj, { addSuffix });
    } catch (error) {
        console.error('Error formatting date:', error);
        return fallback;
    }
};
