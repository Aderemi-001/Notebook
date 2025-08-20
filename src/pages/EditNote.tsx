import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import RichTextEditor from '@/components/RichTextEditor';
import { Label } from '@/components/ui/label';

interface Note {
  id: string;
  title: string;
  content: any; // JSONB content from TipTap
  created_at: string;
  updated_at: string;
}

const fetchNoteDetails = async (noteId: string): Promise<Note> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error("Error fetching note details:", error);
    throw new Error("Failed to fetch note details.");
  }
  if (!data) {
    throw new Error("Note not found.");
  }
  return data as Note;
};

const EditNote: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: note, isLoading, isError, error } = useQuery<Note, Error>({
    queryKey: ['note', noteId],
    queryFn: () => fetchNoteDetails(noteId!),
    enabled: !!noteId,
  });

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  }, [note]);

  const handleSaveNote = async () => {
    if (!noteId) {
      showError("Note ID is missing.");
      return;
    }
    if (!title.trim()) {
      showError("Note title cannot be empty.");
      return;
    }

    setIsSaving(true);
    const toastId = showLoading("Updating your note...");

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: title.trim(),
          content: content,
        })
        .eq('id', noteId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Note updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['userNotes'] }); // Invalidate list of notes
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to update note.");
      console.error("Update note error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!noteId) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        No note ID provided for editing.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-10 w-full mb-6" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading note: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!note) {
    return (
      <div className="container mx-auto py-10 text-center">
        Note not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Edit Note</h1>
        <Button asChild variant="outline">
          <Link to="/notes" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes
          </Link>
        </Button>
      </div>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Note Details</CardTitle>
          <CardDescription>Edit your note's title and content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              placeholder="e.g., Summary of Chapter 3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div>
            <Label htmlFor="note-content">Content</Label>
            <RichTextEditor
              content={content}
              onContentChange={setContent}
              editable={!isSaving}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveNote} disabled={isSaving || !title.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default EditNote;