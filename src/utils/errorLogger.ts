import { supabase } from '@/integrations/supabase/client';

export interface ErrorLogEntry {
    error_message: string;
    component_stack?: string;
    url?: string;
    user_agent?: string;
}

export const logErrorToDB = async (entry: ErrorLogEntry) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.from('error_logs').insert({
            user_id: user?.id || null,
            error_message: entry.error_message,
            component_stack: entry.component_stack,
            url: entry.url || window.location.href,
            user_agent: entry.user_agent || navigator.userAgent,
        });

        // Optional: Could trigger a real-time broadcast to admins here if critical

    } catch (err) {
        // Fallback if logging fails (e.g. network down)
        console.error('Failed to log error to DB:', err);
    }
};
