import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Save, Trash2, Loader2, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import RichTextEditor from '@/components/RichTextEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useUserPreferences } from '@/hooks/use-user-preferences';

interface Note {
  id: string;
  title: string;
  content: string | null; // JSON string
  user_id: string;
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

const NoteDetail: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState<string | null>(null); // JSON string
  const [isSaving, setIsSaving] = useState(false);
  const [isNewNote, setIsNewNote] = useState(false);

  const { data: fetchedNote, isLoading, isError, error } = useQuery<Note, Error>({
    queryKey: ['note', noteId],
    queryFn: () => fetchNoteDetails(noteId!),
    enabled: !!noteId && noteId !== 'new', // Only fetch if noteId is not 'new'
  });

  useEffect(() => {
    if (noteId === 'new') {
      setIsNewNote(true);
      setNoteTitle('');
      setNoteContent(null); // Empty content for new note
    } else if (fetchedNote) {
      setIsNewNote(false);
      setNoteTitle(fetchedNote.title);
      setNoteContent(fetchedNote.content);
    }
  }, [noteId, fetchedNote]);

  // Debounce content changes to avoid excessive saves
  const debouncedSave = useCallback(
    debounce(async (title: string, content: string | null) => {
      setIsSaving(true);
      const toastId = showLoading("Saving note...");
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated.");
        }

        if (isNewNote) {
          const { data, error } = await supabase
            .from('notes')
            .insert({ user_id: user.id, title, content })
            .select('id')
            .single();
          if (error) throw error;
          showSuccess("Note created successfully!");
          navigate(`/notes/${data.id}`, { replace: true }); // Redirect to new note's URL
        } else {
          const { error } = await supabase
            .from('notes')
            .update({ title, content })
            .eq('id', noteId!)
            .eq('user_id', user.id);
          if (error) throw error;
          showSuccess("Note saved successfully!");
        }
        queryClient.invalidateQueries({ queryKey: ['userNotes'] });
        queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      } catch (err: any) {
        showError(err.message || "Failed to save note.");
        console.error("Save note error:", err);
      } finally {
        dismissToast(toastId);
        setIsSaving(false);
      }
    }, 1000), // Debounce for 1 second
    [noteId, isNewNote, queryClient]
  );

  useEffect(() => {
    if (!isNewNote && fetchedNote) {
      // Only trigger debounced save if content or title has actually changed from fetched state
      if (noteTitle !== fetchedNote.title || noteContent !== fetchedNote.content) {
        debouncedSave(noteTitle, noteContent);
      }
    } else if (isNewNote && noteTitle.trim() !== '') {
      // For new notes, save once a title is entered
      debouncedSave(noteTitle, noteContent);
    }
  }, [noteTitle, noteContent, debouncedSave, isNewNote, fetchedNote]);

  const handleDeleteNote = async () => {
    if (!noteId || isNewNote) return;

    const toastId = showLoading("Deleting note...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated.");
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Note deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['userNotes'] });
      navigate('/notes');
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to delete note.");
      console.error("Delete note error:", err);
    }
  };

  if (isLoading || isLoadingPreferences) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (isError && noteId !== 'new') {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading note: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{isNewNote ? 'Create New Note' : 'Edit Note'}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/notes" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isNewNote && (
                <>
                  {preferences?.confirm_deletion ? (
                    <AlertDialog>
                      <AlertDialogTrigger className="flex items-center w-full text-left px-2 py-1.5 text-sm text-destructive outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Note
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            "{noteTitle}" note.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteNote}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <DropdownMenuItem onClick={handleDeleteNote} className="flex items-center text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Note
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Note Details</CardTitle>
          <CardDescription>Give your note a title and start writing!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Note Title"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="text-2xl font-bold py-6"
          />
          <RichTextEditor
            key={noteId} {/* Add key prop here */}
            initialContent={noteContent}
            onContentChange={setNoteContent}
            placeholder="Start writing your amazing note here..."
          />
        </CardContent>
      </NotebookCard>
    </div>
  );
};

// Simple debounce function
function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

export default NoteDetail;