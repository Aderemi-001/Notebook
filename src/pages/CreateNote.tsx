import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Save, Loader2, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

interface StudySet {
  id: string;
  title: string;
}

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

const CreateNote: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [selectedStudySetId, setSelectedStudySetId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const { data: userStudySets, isLoading: isLoadingSets, isError: isErrorSets, error: errorSets } = useQuery<StudySet[], Error>({
    queryKey: ['userStudySetsForNotes'],
    queryFn: fetchUserStudySets,
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setIsLoadingUser(false);
    };
    getUser();
  }, []);

  const handleSaveNote = async () => {
    if (!title.trim()) {
      showError("Note title cannot be empty.");
      return;
    }
    if (!currentUser) {
      showError("You must be logged in to create a note.");
      return;
    }

    setIsSaving(true);
    const toastId = showLoading("Saving your note...");

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: currentUser.id,
          title: title.trim(),
          content: content,
          study_set_id: selectedStudySetId,
          extracted_content_ai: null, // No longer directly saving extracted content from drawing here
        })
        .select()
        .single();

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Note created successfully!");
      queryClient.invalidateQueries({ queryKey: ['userNotes'] });
      queryClient.invalidateQueries({ queryKey: ['studySet', selectedStudySetId] }); // Invalidate linked study set
      navigate(`/notes/${data.id}/edit`); // Navigate to edit the newly created note
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to save note.");
      console.error("Save note error:", err);
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

  // onDrawingAnalyzed prop is no longer needed here as RichTextEditor handles it internally
  // const handleDrawingAnalyzed = async (base64Image: string) => { ... };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create New Note</h1>
        <Button asChild variant="outline">
          <Link to="/notes" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Notes
          </Link>
        </Button>
      </div>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Note Details</CardTitle>
          <CardDescription>Give your note a title and start writing.</CardDescription>
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
              id="note-content" // Pass the id here
              content={content}
              onContentChange={setContent}
              editable={!isSaving}
              // onDrawingAnalyzed is no longer passed here
            />
          </div>
          {/* Summarize button moved here */}
          <div className="flex justify-end">
            <Button
              onClick={handleSummarizeWithAI}
              disabled={isSummarizing || !content.trim()}
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
          <Select onValueChange={setSelectedStudySetId} value={selectedStudySetId || ""}>
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
        <Button onClick={handleSaveNote} disabled={isSaving || !title.trim() || isLoadingUser}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Save Note
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Note
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateNote;