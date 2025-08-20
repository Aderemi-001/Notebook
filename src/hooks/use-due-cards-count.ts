import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fetchDueCardsCount = async (): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return 0; // No user, no due cards
  }

  const now = new Date();

  // Fetch all cards belonging to the user's study sets
  const { data: userCards, error: cardsError } = await supabase
    .from('cards')
    .select(`
      id,
      set_id,
      study_sets(user_id),
      user_progress!user_progress_card_id_fkey!left(
        status,
        next_review_at,
        user_id
      )
    `)
    .eq('study_sets.user_id', user.id); // Filter by user's own study sets

  if (cardsError) {
    console.error("Error fetching user cards for due count:", cardsError);
    throw new Error("Failed to fetch cards for due count.");
  }

  let dueCount = 0;
  userCards?.forEach(card => {
    const progress = card.user_progress?.[0];
    const hasProgressForCurrentUser = !!progress && progress.user_id === user.id;
    const cardStatus = hasProgressForCurrentUser ? progress.status : 'learning';
    const nextReviewAt = hasProgressForCurrentUser ? new Date(progress.next_review_at) : now; // New cards are considered due now

    if (cardStatus === 'learning' && nextReviewAt <= now) {
      dueCount++;
    }
  });

  return dueCount;
};

export const useDueCardsCount = () => {
  return useQuery<number, Error>({
    queryKey: ['dueCardsCount'],
    queryFn: fetchDueCardsCount,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes to check for new due cards
    staleTime: 1000 * 60 * 2, // Data is fresh for 2 minutes
  });
};