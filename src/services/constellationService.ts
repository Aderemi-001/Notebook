import { supabase } from '@/integrations/supabase/client';
import { NovaAI } from '@/utils/NovaAI';

export const constellationService = {

    /**
     * Checks if the user has any concepts mapped.
     */
    async hasConstellationData(): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { count, error } = await supabase
            .from('concepts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        if (error) return false;
        return (count || 0) > 0;
    },

    /**
     * Main function to "Map the Universe".
     * 1. Fetches recent study cards.
     * 2. Uses AI to extract concepts and relationships.
     * 3. Saves to DB.
     */
    async generateUniverse(): Promise<{ conceptsLength: number, relationshipsLength: number }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // 1. Fetch source material (Cards)
        // Limit to 200 recent cards to avoid huge context, or prioritize "Mastered" cards?
        // Let's take top 100 cards from most recent sets.
        const { data: cards, error: cardsError } = await supabase
            .from('cards')
            .select('term, definition')
            .order('created_at', { ascending: false })
            .limit(100);

        if (cardsError) throw cardsError;
        if (!cards || cards.length === 0) return { conceptsLength: 0, relationshipsLength: 0 };

        const contextText = cards.map(c => `Term: ${c.term}\nDefinition: ${c.definition}`).join('\n---\n');

        // 2. Call AI
        const graphData = await NovaAI.generateKnowledgeGraph(contextText);

        if (!graphData.concepts || graphData.concepts.length === 0) {
            return { conceptsLength: 0, relationshipsLength: 0 };
        }

        // 3. Save to DB (Concepts)
        // We need to upsert by name to avoid duplicates, but Supabase upsert requires a unique constraint on (user_id, name).
        // Assuming such constraint exists or we handle it manually.

        // Manual "Check and Insert" approach to be safe:
        const { data: existingConcepts } = await supabase
            .from('concepts')
            .select('id, name')
            .eq('user_id', user.id);

        const existingNameMap = new Map(existingConcepts?.map(c => [c.name.toLowerCase(), c.id]));
        const newConceptsToInsert: any[] = [];
        const finalIdMap = new Map(existingNameMap); // name -> id

        // Filter new concepts
        for (const concept of graphData.concepts) {
            if (!existingNameMap.has(concept.name.toLowerCase())) {
                newConceptsToInsert.push({
                    user_id: user.id,
                    name: concept.name,
                    description: concept.description
                });
            }
        }

        if (newConceptsToInsert.length > 0) {
            const { data: inserted, error: insertError } = await supabase
                .from('concepts')
                .insert(newConceptsToInsert)
                .select('id, name');

            if (insertError) throw insertError;

            // Update map
            inserted.forEach(c => finalIdMap.set(c.name.toLowerCase(), c.id));
        }

        // 4. Save to DB (Relationships)
        // Only insert if both source and target exist
        const relsToInsert = [];
        for (const rel of graphData.relationships) {
            const sid = finalIdMap.get(rel.source_name.toLowerCase());
            const tid = finalIdMap.get(rel.target_name.toLowerCase());

            if (sid && tid && sid !== tid) {
                relsToInsert.push({
                    user_id: user.id,
                    source_concept_id: sid,
                    target_concept_id: tid,
                    type: rel.type,
                    strength: rel.strength
                });
            }
        }

        if (relsToInsert.length > 0) {
            // Check for existing rels to detect duplicates? 
            // Or just insert and ignore unique violations if constraint exists?
            // For now, let's just insert.
            const { error: relError } = await supabase
                .from('concept_relationships')
                .insert(relsToInsert);
            // Silent fail on duplicate rels if constraint exists
            if (relError && !relError.message.includes('unique')) {
                console.error("Rel insert error", relError);
            }
        }

        return {
            conceptsLength: finalIdMap.size,
            relationshipsLength: relsToInsert.length
        };
    },

    /**
     * Fetches graph data for visualization
     */
    async getGraphData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data: nodes } = await supabase
            .from('concepts')
            .select('id, name, description')
            .eq('user_id', user.id);

        const { data: edges } = await supabase
            .from('concept_relationships')
            .select('source_concept_id, target_concept_id, type, strength')
            .eq('user_id', user.id);

        return {
            nodes: nodes || [],
            edges: edges?.map(e => ({
                source: e.source_concept_id,
                target: e.target_concept_id,
                type: e.type,
                strength: e.strength
            })) || []
        };
    }
};
