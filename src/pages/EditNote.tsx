import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { RichTextEditorToolbar } from '@/components/RichTextEditorToolbar';
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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

interface Note {
  id: string;
  title: string;
  content: any;
  created_at: string;
  updated_at: string;
}

const EditNote: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { noteId } = useParams<{ noteId: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [noteContent, setNoteContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
    ],
    content: noteContent,
    onUpdate: ({ editor }) => {
      setNoteContent(editor.getJSON());
    },
    editable: !!note, // Only editable if note data is loaded
  });

  useEffect(() => {
    if (editor && noteContent) {
      editor.commands.setContent(noteContent); // Set content without focusing
      editor.commands.focus(); // Focus after setting content
    }
  }, [editor, noteContent]);

  useEffect(() => {
    const fetchNote = async () => {
      if (!user || !noteId) return;

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        toast.error('Failed to load note: ' + error.message);
        console.error('Error fetching note:', error);
        navigate('/notes'); // Redirect if note not found or not authorized
      } else if (data) {
        setNote(data);
        setTitle(data.title);
        setNoteContent(data.content);
      }
      setIsLoading(false);
    };

    fetchNote();
  }, [user, noteId, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !noteId || !note) return;
    if (!title.trim()) {
      toast.error('Note title cannot be empty.');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('notes')
      .update({
        title,
        content: noteContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to save note: ' + error.message);
      console.error('Error saving note:', error);
    } else {
      toast.success('Note saved successfully!');
      setNote((prev) => (prev ? { ...prev, title, content: noteContent, updated_at: new Date().toISOString() } : null));
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!user || !noteId) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to delete note: ' + error.message);
      console.error('Error deleting note:', error);
    } else {
      toast.success('Note deleted successfully!');
      navigate('/notes');
    }
    setIsDeleting(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/3 mb-8" />
        <Card className="mb-8">
          <CardHeader>
            <Skeleton className="h-6 w-1/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[250px] w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="container mx-auto py-10 text-center animate-fade-in">
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Note not found or you do not have permission to view it.</p>
          <Button asChild className="mt-4">
            <Link to="/notes">Back to Notes</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Edit Note</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/notes" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex items-center" disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your note and remove its data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Note Details</CardTitle>
          <CardDescription>Edit the title and content of your note.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="My Awesome Note"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <div className="border rounded-md">
                <RichTextEditorToolbar editor={editor} />
                <EditorContent editor={editor} className="min-h-[200px] p-4 prose max-w-none dark:prose-invert" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-pulse" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditNote;