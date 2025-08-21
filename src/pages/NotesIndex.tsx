import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, PlusCircle, FileText, History, Menu, Trash2, Pencil, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';

interface Note {
  id: string;
  title: string;
  content: string; // Changed to string as it's stored as HTML
  created_at: string;
  updated_at: string;
  study_set_id: string | null;
  study_sets: { title: string } | null; // To fetch linked study set title
}

const fetchUserNotes = async (): Promise<Note[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('notes')
    .select(`
      id,
      title,
      content,
      created_at,
      updated_at,
      study_set_id,
      study_sets (title)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching user notes:", error);
    throw new Error("Failed to fetch your notes.");
  }
  return data || [];
};

// Function to convert HTML content to plain text preview
const getPlainTextPreview = (htmlContent: string, maxLength: number = 150): string => {
  if (!htmlContent) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const text = doc.body.textContent || '';
    return text.trim().length > maxLength ? text.trim().substring(0, maxLength) + '...' : text.trim();
  } catch (e) {
    console.error("Error parsing note content for preview:", e);
  }
  return '';
};

const NotesIndex: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();

  const { data: notes, isLoading, isError, error } = useQuery<Note[], Error>({
    queryKey: ['userNotes'],
    queryFn: fetchUserNotes,
  });

  const filteredNotes = notes?.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPlainTextPreview(note.content, 500).toLowerCase().includes(searchTerm.toLowerCase()) || // Search in content preview
    (note.study_sets?.title && note.study_sets.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteNote = async (noteId: string) => {
    const toastId = showLoading("Deleting note...");
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Note deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['userNotes'] });
      // Also invalidate any study sets that might have been linked to this note
      queryClient.invalidateQueries({ queryKey: ['studySet'] });
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
        <Skeleton className="h-10 w-full mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <NotebookCard key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading notes: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Notes</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/create-note" className="flex items-center">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Note
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-muted-foreground mb-6">
        Organize your thoughts, summaries, and learning materials here.
      </p>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search notes by title or content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {(filteredNotes?.length === 0 || !filteredNotes) ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No notes found!</h2>
          <p className="text-muted-foreground mt-2">
            {searchTerm ? "Try a different search term." : "Click 'Create New Note' to get started."}
          </p>
          {!searchTerm && (
            <Button asChild className="mt-4">
              <Link to="/create-note">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Note
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <NotebookCard key={note.id} className="h-full flex flex-col">
              <CardHeader className="flex-grow">
                <CardTitle className="text-lg font-semibold">{note.title}</CardTitle>
                {note.study_sets?.title && (
                  <CardDescription className="flex items-center text-sm text-muted-foreground mt-1">
                    <BookOpen className="mr-1 h-3 w-3" /> Linked to: {note.study_sets.title}
                  </CardDescription>
                )}
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  Last updated: {format(new Date(note.updated_at), 'PPP')}
                </CardDescription>
                {note.content && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                    {getPlainTextPreview(note.content)}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex justify-end gap-2 pt-0">
                <Link to={`/notes/${note.id}/edit`}>
                  <Button variant="outline" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                {preferences?.confirm_deletion ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          "{note.title}" note.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteNote(note.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button variant="destructive" size="icon" onClick={() => handleDeleteNote(note.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesIndex;