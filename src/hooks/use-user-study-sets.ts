import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserStudySet {
  id: string;
  title: string;
}

const fetchUserStudySets = async (): Promise<UserStudySet[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('study_sets')
    .select('id, title')
    .eq('user_id', user.id)
    .order('title', { ascending: true });

  if (error) {
    console.error("Error fetching user study sets for linking:", error);
    throw new Error("Failed to fetch your study sets.");
  }
  return data || [];
};

export const useUserStudySets = () => {
  return useQuery<UserStudySet[], Error>({
    queryKey: ['userStudySetsForLinking'],
    queryFn: fetchUserStudySets,
  });
};