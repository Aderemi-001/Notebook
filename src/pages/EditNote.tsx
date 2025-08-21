import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Save, Loader2, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import RichTextEditor from '@/components/RichTextEditor';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Note {
  id: string;
  title: string;
  content: any; // JSONB content from TipTap
  extracted_content_ai: string | null; // New field
  created_at: string;
  updated_at: string;
  study_set_id: string | null;
}

interface StudySet {
  id: string;
  title: string;
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

const fetchUserStudySets = async (): Promise<StudySet[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('study_sets')
    .select('id, title')
    .eq('user_id', user.id)
    .order('title', { ascending: true });

  if (error) {
    console.error("Error fetching user study sets:", error);
    throw new Error("Failed to fetch your study sets.");
  }
  return data || [];
};

const EditNote: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStudySetId, setSelectedStudySetId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isEditorDrawingMode, setIsEditorDrawingMode] = useState(false); // New state

  const { data: note, isLoading, isError, error } = useQuery<Note, Error>({
    queryKey: ['note', noteId],
    queryFn: () => fetchNoteDetails(noteId!),
    enabled: !!noteId,
  });

  const { data: userStudySets, isLoading: isLoadingSets, isError: isErrorSets, error: errorSets } = useQuery<StudySet[], Error>({
    queryKey: ['userStudySetsForNotes'],
    queryFn: fetchUserStudySets,
  });

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setSelectedStudySetId(note.study_set_id);
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
          study_set_id: selectedStudySetId,
          extracted_content_ai: null, // No longer directly saving extracted content from drawing here
        })
        .eq('id', noteId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Note updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['userNotes'] }); // Invalidate list of notes
      queryClient.invalidateQueries({ queryKey: ['studySet', selectedStudySetId] }); // Invalidate linked study set
      queryClient.invalidateQueries({ queryKey: ['studySet', note?.study_set_id] }); // Invalidate previously linked study set if changed
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to update note.");
      console.error("Update note error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSummarizeWithAI = async () => {
    if (!content.trim()) {
      showError("Please write some content in the note before summarizing.");
      return;
    }

    setIsSummarizing(true);
    const toastId = showLoading("Generating summary with AI...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session not found. Please log in again.");
      }

      const response = await fetch(
        `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/summarize-note`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJis_publicsIjoiInN1cGFiYXNlIiwicmVmIjoianVvc2RtZWNwZHV6bHZyaW5uendmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNjA1MTAsImV4cCI6MjA2MjkzNjUxMH0.xvg8a1qa6WBuWY9VDLNtQxjnL5VmylefmfchofI1mJU",
          },
          body: JSON.stringify({ noteContent: content }),
        }
      );

      const result = await response.json();
      dismissToast(toastId);

      if (!response.ok || result.error) {
        throw new Error(result?.error || "Failed to generate summary.");
      }

      setAiSummary(result.summary);
      showSuccess("Summary generated successfully!");
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "An unexpected error occurred during summarization.");
      console.error("AI summarization error:", err);
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!noteId) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        No note ID provided for editing.
      </div>
    );
  }

  if (isLoading || isLoadingSets) {
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
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Notes
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
            <Label id="note-content-label">Content</Label> {/* Updated label with id */}
            <RichTextEditor
              labelId="note-content-label" // Pass the labelId here
              content={content}
              onContentChange={setContent}
              editable={!isSaving}
              onDrawingModeChange={setIsEditorDrawingMode} // Pass the setter
            />
          </div>
          {/* Summarize button moved here */}
          <div className="flex justify-end">
            <Button
              onClick={handleSummarizeWithAI}
              disabled={isSummarizing || !content.trim() || isEditorDrawingMode} // Disable when in drawing mode
              variant="outline"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Summarizing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" /> Summarize with AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </NotebookCard>

      {/* Removed AI Extracted Content Card */}

      {aiSummary && (
        <NotebookCard className="mb-6">
          <CardHeader>
            <CardTitle>AI Summary</CardTitle>
            <CardDescription>Key takeaways from your note.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground">{aiSummary}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setContent(prev => prev + "\n\n---\n\n**AI Summary:**\n" + aiSummary);
                setAiSummary(null); // Clear summary after adding to content
                showSuccess("Summary added to note content!");
              }}
            >
              Add to Note Content
            </Button>
          </CardContent>
        </NotebookCard>
      )}

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Link to Study Set</CardTitle>
          <CardDescription>Associate this note with a study set.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={(value) => setSelectedStudySetId(value === "null" ? null : value)} value={selectedStudySetId || "null"}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a study set (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="null">No linked set</SelectItem> {/* Option to clear selection */}
              {isLoadingSets ? (
                <SelectItem disabled value="loading">Loading study sets...</SelectItem>
              ) : userStudySets?.length === 0 ? (
                <SelectItem disabled value="no-sets">No study sets available</SelectItem>
              ) : (
                userStudySets?.map(set => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {isErrorSets && <p className="text-sm text-red-500 mt-1">Error loading sets: {errorSets?.message}</p>}
        </CardContent>
      </NotebookCard>

      {/* Save button moved to the very end of the page */}
      <div className="flex justify-end mt-8">
        <Button onClick={handleSaveNote} disabled={isSaving || !title.trim()}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Save Changes
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default EditNote;