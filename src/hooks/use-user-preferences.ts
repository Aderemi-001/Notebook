import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

export interface UserPreferences {
  user_id: string;
  default_flashcard_side: 'term' | 'definition';
  confirm_deletion: boolean;
  default_num_exam_questions: number;
  default_exam_question_types: string[];
  daily_cards_goal: number;
  enable_review_reminders: boolean;
}

const fetchUserPreferences = async (): Promise<UserPreferences | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    throw error;
  }

  return data as UserPreferences | null;
};

const updateUserPreferences = async (preferences: Partial<UserPreferences>): Promise<UserPreferences> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(
      { ...preferences, user_id: user.id },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data as UserPreferences;
};

export const useUserPreferences = () => {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, isError, error } = useQuery<UserPreferences | null, Error>({
    queryKey: ['userPreferences'],
    queryFn: fetchUserPreferences,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const mutation = useMutation<UserPreferences, Error, Partial<UserPreferences>>({
    mutationFn: updateUserPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(['userPreferences'], data);
      showSuccess("Preferences saved!");
    },
    onError: (err) => {
      showError(`Failed to save preferences: ${err.message}`);
      console.error("Error saving preferences:", err);
    },
  });

  return {
    preferences,
    isLoading,
    isError,
    error,
    updatePreferences: mutation.mutate,
  };
};