import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudySetGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
}

const fetchUserStudySetGroups = async (): Promise<StudySetGroup[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }
  const { data, error } = await supabase
    .from('study_set_groups')
    .select('id, name, description, created_at')
    .eq('user_id', user.id)
    .order('name', { ascending: true });
  if (error) {
    console.error("Error fetching study set groups:", error);
    throw new Error("Failed to fetch your study set groups.");
  }
  return (data || []).map(item => ({
    ...item,
    created_at: item.created_at || new Date().toISOString()
  }));
};

export const useStudySetGroups = () => {
  return useQuery<StudySetGroup[], Error>({
    queryKey: ['userStudySetGroups'],
    queryFn: fetchUserStudySetGroups,
  });
};

export const useCreateStudySetGroup = () => {
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data, error } = await supabase
        .from('study_set_groups')
        .insert({ name, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate query to refresh list
    },
  });
};