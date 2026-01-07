import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AIFocusSuggestion {
    term: string;
    setId: string;
    reason: 'weakness' | 'due' | 'new';
    confidence: number;
}

export function useAIFocus() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['ai-focus', user?.id],
        queryFn: async (): Promise<AIFocusSuggestion | null> => {
            if (!user) return null;

            // 1. Look for weaknesses (low ease factor, previously studied)
            const { data: weakCards, error } = await supabase
                .from('user_progress')
                .select(`
          card_id,
          ease_factor,
          repetition_level,
          cards (
            term,
            set_id
          )
        `)
                .eq('user_id', user.id)
                .gt('repetition_level', 0) // Must have been studied
                .lt('ease_factor', 2.0) // Hard cards
                .order('ease_factor', { ascending: true })
                .limit(1);

            if (weakCards && weakCards.length > 0) {
                const card = weakCards[0];
                // user_progress.cards is a single object because of the FK, but Supabase types can be tricky.
                // We cast as any to access the joined data safely.
                const cardData = card.cards as any;

                return {
                    term: cardData.term,
                    setId: cardData.set_id,
                    reason: 'weakness',
                    confidence: 0.9
                };
            }

            // 2. Look for due cards (if no weaknesses)
            const { data: dueCards } = await supabase
                .from('user_progress')
                .select(`
          card_id,
          next_review_at,
          cards (
            term,
            set_id
          )
        `)
                .eq('user_id', user.id)
                .lte('next_review_at', new Date().toISOString())
                .order('next_review_at', { ascending: true }) // Most overdue first
                .limit(1);

            if (dueCards && dueCards.length > 0) {
                const card = dueCards[0];
                const cardData = card.cards as any;

                return {
                    term: cardData.term,
                    setId: cardData.set_id,
                    reason: 'due',
                    confidence: 0.8
                };
            }

            return null;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
