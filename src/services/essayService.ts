import { supabase } from "@/integrations/supabase/client";
import { handleSafeAction } from "@/utils/safe-action";

export const essayService = {
    async getEssayQuestions(user_id: string): Promise<any[]> {
        return handleSafeAction(async () => {
            const { data, error } = await supabase
                .from('essay_questions')
                .select('*, study_sets(title)')
                .eq('user_id', user_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        }, "Failed to fetch essay questions", []) as Promise<any[]>;
    },

    async getEssayQuestionById(question_id: string, user_id?: string): Promise<any> {
        return handleSafeAction(async () => {
            const { data, error } = await supabase
                .from('essay_questions')
                .select(`
                    id,
                    question_text,
                    suggested_points,
                    created_at,
                    study_set_id,
                    study_sets (title, user_id, is_public)
                `)
                .eq('id', question_id)
                .single();

            if (error) throw error;
            if (!data) throw new Error("Question not found");

            // Check access
            const studySet = Array.isArray(data.study_sets) ? data.study_sets[0] : data.study_sets;
            if (studySet && user_id) {
                const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user_id).single();
                const isAdmin = profile?.is_admin || false;
                const hasAccess = studySet.is_public || studySet.user_id === user_id || isAdmin;
                if (!hasAccess) throw new Error("You do not have permission to view this content.");
            }

            return data;
        }, "Failed to load essay question", null);
    },

    async getPreviousSubmission(question_id: string, user_id: string): Promise<any> {
        return handleSafeAction(async () => {
            const { data, error } = await supabase
                .from('essay_submissions')
                .select('*')
                .eq('question_id', question_id)
                .eq('user_id', user_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) return null;
            return data;
        }, "Failed to load previous submission", null);
    },

    async deleteEssayQuestion(question_id: string): Promise<boolean> {
        return handleSafeAction(async () => {
            const { error } = await supabase
                .from('essay_questions')
                .delete()
                .eq('id', question_id);

            if (error) throw error;
            return true;
        }, "Failed to delete question", false) as Promise<boolean>;
    },

    async saveSubmission(submission: any): Promise<any> {
        return handleSafeAction(async () => {
            const { data, error } = await supabase
                .from('essay_submissions')
                .insert(submission)
                .select()
                .single();
            if (error) throw error;
            return data;
        }, "Failed to save your essay progress", null);
    }
};
