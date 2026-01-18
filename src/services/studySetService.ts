import { supabase } from '@/integrations/supabase/client';
import { handleSafeAction } from '@/utils/safe-action';

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
     * Fetch all study sets for the current user (including owned and library)
     */
    async getMyStudySets(): Promise<StudySet[]> {
        return handleSafeAction(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            // Fetch owned sets
            const { data: ownedData, error: ownedError } = await supabase
                .from('study_sets')
                .select(`
                    *,
                    cards:cards(count)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (ownedError) throw ownedError;

            // Fetch library sets (those added from others)
            const { data: libraryData, error: libraryError } = await supabase
                .from('user_study_set_library')
                .select(`
                    set_id,
                    study_sets (
                        *,
                        cards:cards(count)
                    )
                `)
                .eq('user_id', user.id);

            if (libraryError) throw libraryError;

            const ownedSets = (ownedData as any[]).map(set => ({
                ...set,
                cards_count: set.cards ? set.cards[0]?.count : 0,
                is_owner: true
            }));

            const librarySets = (libraryData as any[])
                .filter(item => item.study_sets) // Ensure set still exists
                .map(item => ({
                    ...item.study_sets,
                    cards_count: item.study_sets.cards ? item.study_sets.cards[0]?.count : 0,
                    is_owner: false
                }));

            // Combine and unique by ID (if someone added their own set, though RLS/UI should prevent clutter)
            const combined = [...ownedSets];
            librarySets.forEach(ls => {
                if (!combined.some(os => os.id === ls.id)) {
                    combined.push(ls);
                }
            });

            return combined;
        }, "Failed to load your study sets", []) as Promise<StudySet[]>;
    },

    /**
     * Add a set to user's library
     */
    async addToLibrary(setId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('user_study_set_library')
            .upsert({ user_id: user.id, set_id: setId });

        if (error) throw error;
    },

    /**
     * Remove a set from user's library
     */
    async removeFromLibrary(setId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('user_study_set_library')
            .delete()
            .match({ user_id: user.id, set_id: setId });

        if (error) throw error;
    },

    /**
     * Check if a set is in user's library
     */
    async isInLibrary(setId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data, error } = await supabase
            .from('user_study_set_library')
            .select('set_id')
            .match({ user_id: user.id, set_id: setId })
            .maybeSingle();

        if (error) return false;
        return !!data;
    },

    /**
     * Get a single study set by ID
     */
    async getStudySetById(id: string) {
        return handleSafeAction(async () => {
            const { data, error } = await supabase
                .from('study_sets')
                .select('*, cards(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        }, "Failed to load study set");
    },

    /**
     * Create a new study set
     */
    async createStudySet(title: string, description: string = '', isPublic: boolean = false) {
        return handleSafeAction(async () => {
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
        }, "Failed to create study set");
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
    },

    /**
     * Create a study set with cards and optional concept links (Transaction-like)
     */
    async createSetWithCards(
        setDetails: { title: string, description?: string, is_public: boolean, group_id?: string | null, source_text?: string | null },
        cards: { term: string, definition: string }[],
        conceptLinks?: { card_term: string, concept_name: string }[]
    ) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // 1. Create Set
        const { data: set, error: setError } = await supabase
            .from('study_sets')
            .insert({
                title: setDetails.title,
                description: setDetails.description,
                is_public: setDetails.is_public,
                group_id: setDetails.group_id,
                source_text: setDetails.source_text,
                user_id: user.id
            })
            .select('id')
            .single();

        if (setError) throw setError;
        if (!set) throw new Error('Failed to create set');

        // 2. Insert Cards
        if (cards.length > 0) {
            const cardsToInsert = cards.map(c => ({
                set_id: set.id,
                term: c.term.trim(),
                definition: c.definition.trim()
            }));

            const { data: insertedCards, error: cardsError } = await supabase
                .from('cards')
                .insert(cardsToInsert)
                .select('id, term');

            if (cardsError) throw cardsError;

            // 3. Insert Concept Links (if any)
            if (conceptLinks && conceptLinks.length > 0 && insertedCards) {
                await this.linkConceptsToCards(user.id, insertedCards, conceptLinks);
            }
        }

        return set;
    },

    /**
     * Update a study set and its cards (Diffing logic)
     */
    async updateSetWithCards(
        setId: string,
        setDetails: { title: string, description?: string, is_public: boolean, group_id?: string | null, source_text?: string | null },
        cards: { id?: string, term: string, definition: string }[],
        conceptLinks?: { card_term: string, concept_name: string }[]
    ) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // 1. Update Set Details
        const { error: updateSetError } = await supabase
            .from('study_sets')
            .update({
                title: setDetails.title,
                description: setDetails.description,
                is_public: setDetails.is_public,
                group_id: setDetails.group_id,
                source_text: setDetails.source_text
            })
            .eq('id', setId);

        if (updateSetError) throw updateSetError;

        // 2. Handle Cards (Update, Insert, Delete)
        const existingCards = cards.filter(c => c.id);
        const newCards = cards.filter(c => !c.id);

        // Fetch current DB cards to identify deletions
        const { data: currentDbCards, error: fetchCardsError } = await supabase
            .from('cards')
            .select('id')
            .eq('set_id', setId);

        if (fetchCardsError) throw fetchCardsError;

        const currentDbCardIds = new Set(currentDbCards?.map(c => c.id) || []);
        const formCardIds = new Set(existingCards.map(c => c.id));

        const cardsToDelete = Array.from(currentDbCardIds).filter(id => !formCardIds.has(id));

        // Delete
        if (cardsToDelete.length > 0) {
            const { error: deleteError } = await supabase.from('cards').delete().in('id', cardsToDelete);
            if (deleteError) throw deleteError;
        }

        // Update
        for (const card of existingCards) {
            const { error: updateCardError } = await supabase
                .from('cards')
                .update({ term: card.term.trim(), definition: card.definition.trim() })
                .eq('id', card.id!);
            if (updateCardError) throw updateCardError;
        }

        // Insert New
        if (newCards.length > 0) {
            const cardsToInsert = newCards.map(c => ({
                set_id: setId,
                term: c.term.trim(),
                definition: c.definition.trim()
            }));
            const { error: insertError } = await supabase
                .from('cards')
                .insert(cardsToInsert)
                .select('id, term');

            if (insertError) throw insertError;
        }

        // 3. Link Concepts (Logic adapted for updates - mostly additive for now)
        if (conceptLinks && conceptLinks.length > 0) {
            // We need IDs for all cards (existing + new) to map terms
            // For simplicity, we only link if we have the IDs handy or fetch them.
            // The original code only linked 'newly inserted' or 'all' depending on context.
            // We'll try to link against all involved cards if possible.

            // Re-fetch all cards to get a complete map? Or just use what we have?
            // To be safe and comprehensive like the original code:
            // "const allCardsInSet = [...(studySet?.cards || []), ...(insertedNewCards || [])];"

            // Let's fetch all Term->ID pairs for this set to support full linking
            const { data: allSetCards } = await supabase
                .from('cards')
                .select('id, term')
                .eq('set_id', setId);

            if (allSetCards) {
                await this.linkConceptsToCards(user.id, allSetCards, conceptLinks);
            }
        }
    },

    /**
     * Helper to link concepts to cards
     */
    async linkConceptsToCards(userId: string, cards: { id: string, term: string }[], conceptLinks: { card_term: string, concept_name: string }[]) {
        const cardTermToIdMap = new Map(cards.map(c => [c.term, c.id]));

        const { data: existingConcepts } = await supabase
            .from('concepts')
            .select('id, name')
            .eq('user_id', userId);

        const conceptNameToIdMap = new Map(existingConcepts?.map(c => [c.name, c.id]));
        const cardConceptsToInsert = [];

        for (const link of conceptLinks) {
            const cardId = cardTermToIdMap.get(link.card_term);
            const conceptId = conceptNameToIdMap.get(link.concept_name);

            if (cardId && conceptId) {
                cardConceptsToInsert.push({
                    user_id: userId,
                    card_id: cardId,
                    concept_id: conceptId,
                });
            }
        }

        if (cardConceptsToInsert.length > 0) {
            const { error } = await supabase.from('card_concepts').insert(cardConceptsToInsert);
            if (error) console.error('Error linking concepts:', error);
        }
    }
};
