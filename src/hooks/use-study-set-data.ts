import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth"; // Import useAuth

interface StudySetData {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  group_id: string | null;
  cards: { id: string; term: string; definition: string }[];
  source_text: string | null;
  user_id: string; // Add user_id to the interface
  is_owner: boolean; // Add is_owner to the interface
}

const fetchStudySetForEdit = async (setId: string): Promise<StudySetData> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  // Fetch user profile to check for admin status
  let isAdmin = false;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (profileError && profileError.code !== 'PGRST116') {
    console.error("Error fetching user profile for admin check:", profileError);
  }
  isAdmin = profile?.is_admin || false;

  let query = supabase
    .from('study_sets')
    .select(`
      id,
      title,
      description,
      source_text,
      is_public,
      group_id,
      user_id,
      cards (
        id,
        term,
        definition
      )
    `)
    .eq('id', setId);

  // If not admin, ensure the user owns the set
  if (!isAdmin) {
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error("Error fetching study set for edit:", error);
    throw new Error(`Failed to fetch study set for editing: ${error.message}`);
  }
  if (!data) {
    // If data is null, it means either not found or not owned by user (if not admin)
    throw new Error("Study set not found or you do not have permission to edit it.");
  }

  // Calculate is_owner here
  const isOwner = data.user_id === user.id;

  return { ...data, is_owner: isOwner } as StudySetData;
};

export const useStudySetData = (setId: string | undefined) => {
  const { user, profile } = useAuth(); // Get user and profile for query key
  return useQuery<StudySetData, Error>({
    queryKey: ['editStudySet', setId, user?.id, profile?.is_admin], // Add profile.is_admin to query key
    queryFn: () => fetchStudySetForEdit(setId!),
    enabled: !!setId,
  });
};