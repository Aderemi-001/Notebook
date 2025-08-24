import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
// Removed: import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEditor, /* Removed: EditorContent, */ Editor, /* Removed: JSONContent */ } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from "lowlight";
import { RichTextEditorToolbar } from '@/components/RichTextEditorToolbar';
import { ArrowLeft, Save, Loader2, PenTool, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form } from '@/components/ui/form';
import NoteFormFields from '@/components/notes/NoteFormFields';
import NoteDrawingSection from '@/components/notes/NoteDrawingSection';
import { useQueryClient } from '@tanstack/react-query';
import TextEditorContent from '@/components/TextEditorContent'; // Import TextEditorContent

const lowlight = createLowlight(common);

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  study_set_id: z.string().nullable().optional(),
  content: z.any(), // Tiptap content is complex, use any for now
  drawing_url: z.string().nullable().optional(),
});

type CreateNoteFormValues = z.infer<typeof formSchema>;

const CreateNote: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isSaving, setIsSaving] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false); // State to toggle between text and drawing

  const editorRef = useRef<Editor | null>(null); // Ref for the Tiptap editor

  const form = useForm<CreateNoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      study_set_id: null,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      drawing_url: null,
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }), // Corrected from >) to })
      Image.configure({ inline: true, allowBase64: true }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      Highlight.configure({ multicolor: true }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: form.getValues('content'), // Initialize with form content
    onUpdate: ({ editor }) => {
      form.setValue('content', editor.getJSON(), { shouldDirty: true });
    },
    editable: !isDrawingMode, // Editor is not editable in drawing mode
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Effect to update editor content when form.content changes (e.g., from AI analysis)
  useEffect(() => {
    const currentContent = form.getValues('content');
    if (editor && currentContent && JSON.stringify(editor.getJSON()) !== JSON.stringify(currentContent)) {
      editor.commands.setContent(currentContent, { emitUpdate: false });
    }
  }, [form.watch('content'), editor]); // Watch for changes in form.content

  const handleDrawingSaved = useCallback((dataUrl: string | undefined) => {
    form.setValue('drawing_url', dataUrl || null, { shouldDirty: true });
    toast.success("Drawing saved!");
  }, [form]);

  const handleSubmit = async (values: CreateNoteFormValues) => {
    if (!user) {
      toast.error('You must be logged in to create a note.');
      return;
    }
    if (!values.title.trim()) {
      toast.error('Note title cannot be empty.');
      return;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: values.title,
        content: values.content,
        study_set_id: values.study_set_id,
        drawing_url: values.drawing_url,
      })
      .select();

    if (error) {
      toast.error('Failed to create note: ' + error.message);
      console.error('Error creating note:', error);
    } else {
      toast.success('Note created successfully!');
      queryClient.invalidateQueries({ queryKey: ['userNotes'] }); // Invalidate notes list
      queryClient.invalidateQueries({ queryKey: ['linkedNotes', values.study_set_id] }); // Invalidate linked notes for study set
      navigate(`/notes/${data[0].id}/edit`);
    }
    setIsSaving(false);
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Create New Note</h1>
        <Button variant="outline" asChild>
          <Link to="/notes" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Note Details</CardTitle>
              <CardDescription>Enter the title and content for your new note.</CardDescription>
            </CardHeader>
            <CardContent>
              <NoteFormFields form={form} />
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Note Content</CardTitle>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!isDrawingMode ? "default" : "outline"}
                  onClick={() => setIsDrawingMode(false)}
                  size="sm"
                >
                  <FileText className="mr-2 h-4 w-4" /> Text
                </Button>
                <Button
                  type="button"
                  variant={isDrawingMode ? "default" : "outline"}
                  onClick={() => setIsDrawingMode(true)}
                  size="sm"
                >
                  <PenTool className="mr-2 h-4 w-4" /> Drawing
                </Button>
              </div>
            </CardHeader>
            <CardContent className="relative min-h-[300px] border rounded-md">
              <div className="absolute inset-0 flex flex-col">
                <RichTextEditorToolbar editor={editor} />
                <TextEditorContent
                  editor={editor}
                  editable={!isDrawingMode}
                  isDrawingMode={isDrawingMode}
                  className="flex-grow"
                />
              </div>
              <div className="absolute inset-0">
                <NoteDrawingSection
                  editorRef={editorRef}
                  initialDrawingUrl={form.watch('drawing_url') || undefined}
                  onDrawingSaved={handleDrawingSaved}
                  isDrawingMode={isDrawingMode}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Create Note
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateNote;