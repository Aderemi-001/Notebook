import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import RichTextEditor from '@/components/RichTextEditor';
import { Label } from '@/components/ui/label'; // Import Label

const CreateNote: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

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
        })
        .select()
        .single();

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Note created successfully!");
      queryClient.invalidateQueries({ queryKey: ['userNotes'] });
      navigate(`/notes/${data.id}/edit`); // Navigate to edit the newly created note
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to save note.");
      console.error("Save note error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create New Note</h1>
        <Button asChild variant="outline">
          <Link to="/notes" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes
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
              content={content}
              onContentChange={setContent}
              editable={!isSaving}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveNote} disabled={isSaving || !title.trim() || isLoadingUser}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Note
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default CreateNote;