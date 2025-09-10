import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

export interface CollaborationInvitation {
  id: string;
  study_set_id: string;
  study_sets: {
    id: string;
    title: string;
    description: string | null;
    user_id: string;
  }[] | null; // Changed to array of objects or null
  inviter_id: string;
  inviter_profile: {
    id: string;
    display_name: string | null;
  }[] | null; // Changed to array of objects or null
  invitee_id: string;
  invitee_profile: {
    id: string;
    display_name: string | null;
  }[] | null; // Changed to array of objects or null
  permission_level: 'viewer' | 'editor';
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  created_at: string;
  updated_at: string;
}

const fetchCollaborationInvitations = async (): Promise<CollaborationInvitation[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('study_set_collaborators')
    .select(`
      id,
      study_set_id,
      study_sets (id, title, description, user_id),
      inviter_id,
      inviter_profile:profiles!study_set_collaborators_inviter_id_fkey(id, display_name),
      invitee_id,
      invitee_profile:profiles!study_set_collaborators_invitee_id_fkey(id, display_name),
      permission_level,
      status,
      created_at,
      updated_at
    `)
    .or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`); // Fetch invitations where user is either inviter or invitee

  if (error) {
    console.error("Error fetching collaboration invitations:", error);
    throw new Error("Failed to fetch collaboration invitations.");
  }
  // Ensure data is cast to the correct array type
  return data as CollaborationInvitation[] || [];
};

const updateInvitationStatus = async ({ id, status }: { id: string; status: 'accepted' | 'rejected' | 'revoked' }) => {
  const { data, error } = await supabase
    .from('study_set_collaborators')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const deleteInvitation = async (id: string) => {
  const { error } = await supabase
    .from('study_set_collaborators')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const useCollaborationInvitations = () => {
  const queryClient = useQueryClient();

  const { data: invitations, isLoading, isError, error } = useQuery<CollaborationInvitation[], Error>({
    queryKey: ['collaborationInvitations'],
    queryFn: fetchCollaborationInvitations,
  });

  const updateStatusMutation = useMutation<CollaborationInvitation, Error, { id: string; status: 'accepted' | 'rejected' | 'revoked' }>({
    mutationFn: updateInvitationStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborationInvitations'] });
      showSuccess("Invitation updated successfully!");
    },
    onError: (err) => {
      showError(`Failed to update invitation: ${err.message}`);
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deleteInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborationInvitations'] });
      showSuccess("Invitation deleted successfully!");
    },
    onError: (err) => {
      showError(`Failed to delete invitation: ${err.message}`);
    },
  });

  return {
    invitations,
    isLoading,
    isError,
    error,
    updateStatusMutation, // Return the mutation object
    deleteMutation,     // Return the mutation object
  };
};