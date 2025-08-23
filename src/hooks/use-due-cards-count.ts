import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as React from 'react'; // Explicitly import React

const fetchDueCardsCount = async (): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return 0; // No user, no due cards
  }

  // Use the existing RPC function to get daily review cards
  const { data: dailyReviewCards, error: rpcError } = await supabase
    .rpc('get_daily_review_cards', { p_user_id: user.id });

  if (rpcError) {
    console.error("Error fetching daily review cards for due count:", rpcError);
    throw new Error("Failed to fetch due cards count.");
  }

  // The RPC returns the cards that are due, so we just need to count them
  return dailyReviewCards?.length || 0;
};

export const useDueCardsCount = () => {
  return useQuery<number, Error>({
    queryKey: ['dueCardsCount'],
    queryFn: fetchDueCardsCount,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes to check for new due cards
    staleTime: 1000 * 60 * 2, // Data is fresh for 2 minutes
  });
};