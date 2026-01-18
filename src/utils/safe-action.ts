
import { logErrorToDB } from "./errorLogger";
import { showError } from "./toast";

/**
 * Wraps an asynchronous action with error handling and logging.
 * @param action The asynchronous function to execute
 * @param errorMessage User-friendly error message to show in toast
 * @param fallback Fallback value to return on error
 */
export const handleSafeAction = async <T>(
    action: () => Promise<T>,
    errorMessage: string = "An unexpected error occurred. Please try again.",
    fallback: T | null = null
): Promise<T | typeof fallback> => {
    try {
        return await action();
    } catch (error: any) {
        console.error(`Safe Action Error: ${errorMessage}`, error);

        // Log to database
        logErrorToDB({
            error_message: `${errorMessage}: ${error.message || String(error)}`,
            url: window.location.href,
            user_agent: navigator.userAgent
        });

        // Notify user
        showError(errorMessage);

        return fallback;
    }
};
