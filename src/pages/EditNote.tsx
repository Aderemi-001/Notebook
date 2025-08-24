import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast'; // Using specific toast functions
import { useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from "lowlight";
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form } from '@/components/ui/form';
import NoteFormFields from '@/components/notes/NoteFormFields';
import { useQueryClient } from '@tanstack/react-query';
import { RichTextEditor } from '@/components/RichTextEditor';

const lowlight = createLowlight(common);

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  study_set_id: z.string().nullable().optional(),
  content: z.any(), // Tiptap content is complex, use any for now
});

type EditNoteFormValues = z.infer<typeof formSchema>;

const EditNote: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { noteId } = useParams<{ noteId: string }>();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const editorRef = useRef<Editor | null>(null); // Ref for the Tiptap editor

  const form = useForm<EditNoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      study_set_id: null,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Image.configure({ inline: true, allowBase64: true }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: form.getValues('content'), // Initialize with form content
    onUpdate: ({ editor }) => {
      form.setValue('content', editor.getJSON(), { shouldDirty: true });
    },
    editable: true, // Always editable in basic mode
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Effect to load note data and populate the form
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
        showError('Failed to load note: ' + error.message);
        console.error('Error fetching note:', error);
        navigate('/notes');
      } else if (data) {
        form.reset({
          title: data.title,
          study_set_id: data.study_set_id,
          content: data.content || { type: 'doc', content: [{ type: 'paragraph' }] },
        });
        // Manually set editor content after form reset
        if (editor) {
          editor.commands.setContent(data.content || { type: 'doc', content: [{ type: 'paragraph' }] }, { emitUpdate: false });
        }
      }
      setIsLoading(false);
    };

    fetchNote();
  }, [user, noteId, navigate, editor, form]);

  // Effect to update editor content when form.content changes (e.g., from external source if any)
  useEffect(() => {
    const currentContent = form.getValues('content');
    if (editor && currentContent && JSON.stringify(editor.getJSON()) !== JSON.stringify(currentContent)) {
      editor.commands.setContent(currentContent, { emitUpdate: false });
    }
  }, [form.watch('content'), editor]);

  const handleSave = async (values: EditNoteFormValues) => {
    if (!user || !noteId) return;
    if (!values.title.trim()) {
      showError('Note title cannot be empty.');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('notes')
      .update({
        title: values.title,
        content: values.content,
        study_set_id: values.study_set_id,
        updated_at: new Date().toISOString(), // Trigger will handle this, but explicit is fine
      })
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (error) {
      showError('Failed to save note: ' + error.message);
      console.error('Error saving note:', error);
    } else {
      showSuccess('Note saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['userNotes'] }); // Invalidate notes list
      queryClient.invalidateQueries({ queryKey: ['linkedNotes', values.study_set_id] }); // Invalidate linked notes for study set
      form.reset(values); // Reset form to mark as pristine
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!user || !noteId) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;

      showSuccess('Note deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['userNotes'] }); // Invalidate notes list
      queryClient.invalidateQueries({ queryKey: ['linkedNotes'] }); // Invalidate all linked notes
      navigate('/notes');
    } catch (err: any) {
      showError('Failed to delete note: ' + err.message);
      console.error('Error deleting note:', err);
    } finally {
      setIsDeleting(false);
    }
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
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[250px] w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
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
                  This action cannot be undone. This will permanently delete your note.
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          <NoteFormFields form={form} />

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Note Content</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[300px] border rounded-md">
              <RichTextEditor
                editorRef={editorRef}
                content={form.watch('content') || ''}
                onContentChange={(newContent: string) => form.setValue('content', newContent, { shouldDirty: true })}
              />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSaving}>
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
        </form>
      </Form>
    </div>
  );
};

export default EditNote;