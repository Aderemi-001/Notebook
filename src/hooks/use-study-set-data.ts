import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StudySetData {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  group_id: string | null; // Added group_id
  cards: { id: string; term: string; definition: string }[];
  source_text: string | null;
}

const fetchStudySetForEdit = async (setId: string): Promise<StudySetData> => {
  const { data, error } = await supabase
    .from('study_sets')
    .select(`
      id,
      title,
      description,
      source_text,
      is_public,
      group_id, // Fetch group_id
      cards (
        id,
        term,
        definition
      )
    `)
    .eq('id', setId)
    .single();

  if (error) {
    console.error("Error fetching study set for edit:", error);
    throw new Error("Failed to fetch study set for editing.");
  }
  if (!data) {
    throw new Error("Study set not found.");
  }
  return data as StudySetData;
};

export const useStudySetData = (setId: string | undefined) => {
  return useQuery<StudySetData, Error>({
    queryKey: ['editStudySet', setId],
    queryFn: () => fetchStudySetForEdit(setId!),
    enabled: !!setId,
  });
};