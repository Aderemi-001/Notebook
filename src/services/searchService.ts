import { supabase } from '@/integrations/supabase/client';
import React from 'react';

export interface SearchResult {
    id: string;
    type: 'set' | 'note' | 'card';
    title: string;
    description?: string | null;
    url: string;
    updated_at: string | null;
    icon?: React.ReactNode;
}

export const globalSearch = async (query: string): Promise<SearchResult[]> => {
    if (!query || query.trim().length === 0) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const searchTerm = `%${query}%`;

    // Parallel queries
    const [setsResponse, notesResponse, cardsResponse] = await Promise.all([
        supabase
            .from('study_sets')
            .select('id, title, description, updated_at')
            .eq('user_id', user.id)
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(5),
        supabase
            .from('notes')
            .select('id, title, updated_at')
            .eq('user_id', user.id)
            .ilike('title', searchTerm)
            .limit(5),
        supabase
            .from('cards')
            .select(`
                id,
                term,
                definition,
                set_id,
                study_sets!inner(id, title, user_id)
            `)
            .eq('study_sets.user_id', user.id)
            .or(`term.ilike.${searchTerm},definition.ilike.${searchTerm}`)
            .limit(10)
    ]);

    if (setsResponse.error) console.error('Error searching sets:', setsResponse.error);
    if (notesResponse.error) console.error('Error searching notes:', notesResponse.error);
    if (cardsResponse.error) console.error('Error searching cards:', cardsResponse.error);

    const results: SearchResult[] = [];

    if (setsResponse.data) {
        results.push(...setsResponse.data.map(set => ({
            id: set.id,
            type: 'set' as const,
            title: set.title,
            description: set.description ?? undefined,
            url: `/sets/${set.id}`,
            updated_at: set.updated_at ?? new Date().toISOString(),
        })));
    }

    if (notesResponse.data) {
        results.push(...notesResponse.data.map(note => ({
            id: note.id,
            type: 'note' as const,
            title: note.title,
            description: 'Note',
            url: `/notebook?noteId=${note.id}`,
            updated_at: note.updated_at ?? new Date().toISOString(),
        })));
    }

    if (cardsResponse.data) {
        results.push(...cardsResponse.data.map((card: any) => ({
            id: card.id,
            type: 'card' as const,
            title: card.term.substring(0, 60) + (card.term.length > 60 ? '...' : ''),
            description: `in "${card.study_sets.title}"`,
            url: `/sets/${card.set_id}`,
            updated_at: new Date().toISOString(),
        })));
    }

    // Sort by updated_at descending
    return results.sort((a, b) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bTime - aTime;
    });
};
