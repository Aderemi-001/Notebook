import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, PlusCircle, Menu, Trash2, Pencil, BookOpen, Image as ImageIcon } from 'lucide-react';
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
import { JSONContent } from '@tiptap/react';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link'; // Import LinkExtension
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'; // Import CodeBlockLowlight
import { common, createLowlight } from "lowlight"; // Import lowlight dependencies
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

const lowlight = createLowlight(common); // Initialize lowlight

interface Note {
  id: string;
  title: string;
  content: JSONContent;
  extracted_content_ai: string | null;
  drawing_url: string | null;
  created_at: string;
  updated_at: string;
  study_set_id: string | null;
  study_sets: { title: string }[] | null;
}

const fetchUserNotes = async (userId: string): Promise<Note[]> => {
  console.log("fetchUserNotes: Attempting to fetch notes for user ID:", userId);

  const { data, error } = await supabase
    .from('notes')
    .select(`
      id,
      title,
      content,
      extracted_content_ai,
      drawing_url,
      created_at,
      updated_at,
      study_set_id,
      study_sets (title)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("fetchUserNotes: Error fetching user notes:", error);
    throw new Error("Failed to fetch your notes.");
  }
  console.log("fetchUserNotes: Successfully fetched notes:", data);
  return data as Note[] || [];
};

// Function to convert JSON content to plain text preview
const getPlainTextPreview = (jsonContent: JSONContent, maxLength: number = 150): string => {
  if (!jsonContent) return '';
  try {
    // Use a minimal set of extensions for text extraction to avoid unnecessary overhead
    const html = generateHTML(jsonContent, [
      StarterKit.configure({
        // Only include basic text-generating extensions
        paragraph: {},
        heading: { levels: [1, 2, 3] },
        bold: {},
        italic: {},
        strike: {},
        bulletList: {},
        orderedList: {},
        blockquote: {},
        codeBlock: false, // Disable default codeBlock to use CodeBlockLowlight
      }),
      Highlight,
      TaskList,
      TaskItem,
      Image,
      LinkExtension.configure({ openOnClick: false, autolink: true }), // Added LinkExtension
      CodeBlockLowlight.configure({ lowlight }), // Added CodeBlockLowlight
    ]);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
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
  const { user, loading: isLoadingAuth } = useAuth(); // Get user from useAuth

  console.log("NotesIndex: User from useAuth:", user);
  console.log("NotesIndex: isLoadingAuth:", isLoadingAuth);

  const { data: notes, isLoading, isError, error } = useQuery<Note[], Error>({
    queryKey: ['userNotes', user?.id], // Include user.id in queryKey
    queryFn: () => fetchUserNotes(user!.id), // Pass user.id to fetcher
    enabled: !!user?.id && !isLoadingAuth, // Only run query if user is authenticated and auth is not loading
  });

  const filteredNotes = notes?.filter((note: Note) =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPlainTextPreview(note.content, 500).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.extracted_content_ai && note.extracted_content_ai.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (note.study_sets?.[0]?.title && note.study_sets[0].title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteNote = async (noteId: string) => {
    const toastId = showLoading("Deleting note...");
    try {
      // First, fetch the note to get the drawing_url if it exists
      const { data: noteToDelete, error: fetchNoteError } = await supabase
        .from('notes')
        .select('drawing_url')
        .eq('id', noteId)
        .single();

      if (fetchNoteError && fetchNoteError.code !== 'PGRST116') {
        throw fetchNoteError;
      }

      // If a drawing_url exists, delete the image from storage
      if (noteToDelete?.drawing_url) {
        const urlParts = noteToDelete.drawing_url.split('/');
        const fileName = urlParts.slice(urlParts.indexOf('drawings')).join('/'); // Get path from 'drawings' onwards
        
        const { error: deleteStorageError } = await supabase.storage
          .from('notes_drawings')
          .remove([fileName]);

        if (deleteStorageError) {
          console.warn("Failed to delete drawing from storage:", deleteStorageError.message);
          // Don't throw, proceed with note deletion even if image deletion fails
        }
      }

      // Then, delete the note record from the database
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Note deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['userNotes'] });
      queryClient.invalidateQueries({ queryKey: ['studySet'] });
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to delete note.");
      console.error("Delete note error:", err);
    }
  };

  if (isLoadingAuth || isLoading || isLoadingPreferences) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
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
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error loading notes: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">My Notes</h1>
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
          placeholder="Search notes by title, content, or AI extracted text..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
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
          {filteredNotes.map((note: Note) => (
            <NotebookCard key={note.id} className="h-full flex flex-col">
              <CardHeader className="flex-grow">
                <CardTitle className="text-lg font-semibold">{note.title}</CardTitle>
                {note.study_sets?.[0]?.title && (
                  <CardDescription className="flex items-center text-sm text-muted-foreground mt-1">
                    <BookOpen className="mr-1 h-3 w-3" /> Linked to: {note.study_sets[0].title}
                  </CardDescription>
                )}
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  Last updated: {format(new Date(note.updated_at), 'PPP')}
                </CardDescription>
                {note.drawing_url && (
                  <div className="flex items-center text-sm text-blue-500 mt-2 italic">
                    <ImageIcon className="mr-1 h-3 w-3" /> Contains a drawing
                  </div>
                )}
                {note.content && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                    {getPlainTextPreview(note.content)}
                  </p>
                )}
                {note.extracted_content_ai && (
                  <p className="text-xs text-blue-500 mt-1 italic line-clamp-2">
                    AI extracted: "{note.extracted_content_ai.substring(0, 100)}..."
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