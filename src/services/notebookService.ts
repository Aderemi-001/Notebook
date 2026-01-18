import { supabase } from "@/integrations/supabase/client";
import { handleSafeAction } from "@/utils/safe-action";
import { NoteSummary } from "@/pages/Notebook";

export const notebookService = {
    async getMyNotes(user_id: string): Promise<NoteSummary[]> {
        return handleSafeAction(async () => {
            const { data, error } = await supabase
                .from('notes')
                .select('id, title, updated_at, content')
                .eq('user_id', user_id)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data as NoteSummary[];
        }, "Failed to fetch your notes", []) as Promise<NoteSummary[]>;
    },

    async createNote(user_id: string, type: 'text' | 'canvas'): Promise<any> {
        return handleSafeAction(async () => {
            const newNote = {
                user_id,
                title: "Untitled Note",
                content: type === 'canvas'
                    ? { type: 'canvas', version: 1, image: null, background: 'lined' }
                    : { type: 'doc', content: [{ type: 'paragraph' }] }
            };
            const { data, error } = await supabase.from('notes').insert(newNote).select().single();
            if (error) throw error;
            return data;
        }, "Failed to create note", null);
    },

    async updateNote(note_id: string, updates: any): Promise<any> {
        return handleSafeAction(async () => {
            const { data, error } = await supabase
                .from('notes')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', note_id)
                .select()
                .single();
            if (error) throw error;
            return data;
        }, "Failed to save note", null);
    },

    async deleteNote(note_id: string): Promise<boolean> {
        return handleSafeAction(async () => {
            const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', note_id);
            if (error) throw error;
            return true;
        }, "Failed to delete note", false) as Promise<boolean>;
    },

    async getNoteById(note_id: string): Promise<any> {
        return handleSafeAction(async () => {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .eq('id', note_id)
                .single();
            if (error) throw error;
            return data;
        }, "Failed to load note", null);
    }
};
