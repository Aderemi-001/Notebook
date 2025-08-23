import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as React from 'react'; // Explicitly import React

interface StudySetData {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  group_id: string | null;
  cards: { id: string; term: string; definition: string }[];
  source_text: string | null;
}

const fetchStudySetForEdit = async (setId: string): Promise<StudySetData> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('study_sets')
    .select(`
      id,
      title,
      description,
      source_text,
      is_public,
      group_id,
      cards (
        id,
        term,
        definition
      )
    `)
    .eq('id', setId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error("Error fetching study set for edit:", error);
    throw new Error(`Failed to fetch study set for editing: ${error.message}`);
  }
  if (!data) {
    // If data is null, it means either not found or not owned by user
    throw new Error("Study set not found or you do not have permission to edit it.");
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