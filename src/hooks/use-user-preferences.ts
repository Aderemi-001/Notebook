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
    console.log("No authenticated user found for preferences.");
    return null;
  }

  console.log("Attempting to fetch user preferences for user ID:", user.id);

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // PGRST116 means no rows found
      console.warn("No user preferences found for this user (PGRST116). A default will be inserted on first update.");
      return null;
    }
    console.error("Error fetching user preferences:", error); // Only log for other, unexpected errors
    throw error; // Re-throw other errors, including 406
  }

  console.log("Successfully fetched user preferences:", data);
  return data as UserPreferences | null;
};

const updateUserPreferences = async (preferences: Partial<UserPreferences>): Promise<UserPreferences> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  console.log("Attempting to update user preferences for user ID:", user.id, "with data:", preferences);

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(
      { ...preferences, user_id: user.id },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error("Error updating user preferences:", error);
    throw error;
  }
  console.log("Successfully updated user preferences:", data);
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
    onSuccess: (data: UserPreferences) => {
      queryClient.setQueryData(['userPreferences'], data);
      showSuccess("Preferences saved!");
    },
    onError: (err: Error) => {
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