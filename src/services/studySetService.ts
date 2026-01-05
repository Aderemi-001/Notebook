
import { supabase } from '@/integrations/supabase/client';

export interface StudySet {
    id: string;
    title: string;
    description: string | null;
    is_public: boolean;
    user_id: string;
    created_at: string;
    display_name?: string | null; // For joined table
    cards_count?: number; // From RPC
    is_owner?: boolean;
}

export const studySetService = {
    /**
     * Fetch all study sets for the current user (including owned)
     */
    async getMyStudySets(): Promise<StudySet[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Use reliable manual join strategy to avoid RPC issues
        const { data, error } = await supabase
            .from('study_sets')
            .select(`
                *,
                cards:cards(count)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching study sets:', error);
            throw error;
        }

        // Map the count from the joined relation
        return (data as any[]).map(set => ({
            ...set,
            cards_count: set.cards ? set.cards[0]?.count : 0,
            is_owner: set.user_id === user.id
        }));
    },

    /**
     * Get a single study set by ID
     */
    async getStudySetById(id: string) {
        const { data, error } = await supabase
            .from('study_sets')
            .select('*, cards(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create a new study set
     */
    async createStudySet(title: string, description: string = '', isPublic: boolean = false) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('study_sets')
            .insert({
                title,
                description,
                is_public: isPublic,
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing study set
     */
    async updateStudySet(id: string, updates: Partial<Pick<StudySet, 'title' | 'description' | 'is_public'>>) {
        const { error } = await supabase
            .from('study_sets')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Delete a study set
     */
    async deleteStudySet(id: string) {
        const { error } = await supabase
            .from('study_sets')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
