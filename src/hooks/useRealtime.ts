import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useRealtime = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        // Create a single channel for all relevant table updates
        const channel = supabase
            .channel('db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'study_sets',
                },
                (payload) => {
                    console.log('Real-time update received for study_sets:', payload);
                    // Invalidate the query to refetch fresh data
                    queryClient.invalidateQueries({ queryKey: ['studySets'] });

                    // Optional: Show a toast for significant events (can be annoying if too frequent, keeping it subtle or just log)
                    if (payload.eventType === 'INSERT') {
                        // Maybe show specific UI indicator? For now, the invalidate is enough for instant UI update.
                    }
                }
            )
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient]);
};
