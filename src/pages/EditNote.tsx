import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, FileText, Save, Loader2, TextCursorInput, Image as ImageIcon } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Editor } from "@tiptap/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form } from "@/components/ui/form";

// Tiptap imports for content conversion
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from "lowlight";
import TaskList from '@tiptap/extension-task-list'; // Added
import TaskItem from '@tiptap/extension-task-item'; // Added

// New modular imports
import NoteFormFields from "@/components/notes/NoteFormFields";
import NoteDrawingSection from "@/components/notes/NoteDrawingSection";
import { cn } from "@/lib/utils"; // Import cn utility

const lowlight = createLowlight(common);

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  study_set_id: z.string().nullable().optional(),
});

type EditNoteFormValues = z.infer<typeof formSchema>;

const EditNote: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [richTextContent, setRichTextContent] = useState<string>("");
  const [drawingUrl, setDrawingUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const form = useForm<EditNoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      study_set_id: null,
    },
  });

  const [activeView, setActiveView] = useState<'editor' | 'drawing'>('editor');

  useEffect(() => {
    const fetchNote = async () => {
      if (!noteId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("notes")
          .select("*")
          .eq("id", noteId)
          .single();

        if (error) throw error;

        if (data) {
          form.reset({
            title: data.title,
            study_set_id: data.study_set_id,
          });
          if (data.content) {
            const htmlContent = generateHTML(data.content, [
              StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                codeBlock: false,
                link: false, // Explicitly disable link from StarterKit
              }),
              Image.configure({ inline: true, allowBase64: true }),
              LinkExtension.configure({ openOnClick: false, autolink: true }),
              Highlight.configure({ multicolor: true }),
              CodeBlockLowlight.configure({ lowlight }),
              TaskList, // Added
              TaskItem, // Added
            ]);
            setRichTextContent(htmlContent);
          } else {
            setRichTextContent("");
          }
          setDrawingUrl(data.drawing_url || undefined);
        }
      } catch (error: any) {
        console.error("Error fetching note:", error);
        showError(`Failed to fetch note: ${error.message}`);
        navigate("/notes");
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [noteId, navigate, form]);

  const handleSummarizeNote = async () => {
    if (!user) {
      showError("You must be logged in to summarize a note.");
      return;
    }
    if (!richTextContent.trim()) {
      showError("Please write some content to summarize.");
      return;
    }

    const toastId = showLoading("AI is summarizing your note...");
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
          },
          body: JSON.stringify({ noteContent: richTextContent }),
        }
      );

      const result = await response.json();
      dismissToast(toastId);

      if (!response.ok || result.error) {
        throw new Error(result?.error || "Failed to summarize note.");
      }

      if (editorRef.current) {
        editorRef.current.chain().focus().insertContent(`\n\n--- AI Summary ---\n${result.summary}\n---`).run();
        setRichTextContent(editorRef.current.getHTML());
      }
      showSuccess("Note summarized successfully!");
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "An unexpected error occurred during summarization.");
      console.error("Note summarization error:", err);
    }
  };

  const onSubmit = async (values: EditNoteFormValues) => {
    if (!noteId) {
      showError("Note ID is missing.");
      return;
    }

    setIsSaving(true);
    const toastId = showLoading("Updating note...");

    try {
      const { data: { user: currentUserSession }, error: userSessionError } = await supabase.auth.getUser();
      if (userSessionError || !currentUserSession) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const { error } = await supabase
        .from("notes")
        .update({
          title: values.title,
          content: editorRef.current?.getJSON(),
          drawing_url: drawingUrl,
          study_set_id: values.study_set_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId)
        .eq("user_id", currentUserSession.id);

      if (error) throw error;

      showSuccess("Note updated successfully!");
      navigate(`/notes/${noteId}/edit`);
    } catch (error: any) {
      console.error("Error updating note:", error);
      showError(`Failed to update note: ${error.message}`);
    } finally {
      dismissToast(toastId);
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center">Loading note...</div>;
  }

  const isDrawingFeatureUnderConstruction = true; // Flag to control drawing feature visibility

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Edit Note</h1>
        <Button asChild variant="outline">
          <Link to="/notes" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Notes
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <NoteFormFields form={form} />

          <div className="flex space-x-2 mb-4">
            <Button
              type="button"
              variant={activeView === 'editor' ? 'default' : 'outline'}
              onClick={() => setActiveView('editor')}
              className="flex-1"
            >
              <TextCursorInput className="mr-2 h-4 w-4" /> Text Editor
            </Button>
            <Button
              type="button"
              variant={activeView === 'drawing' ? 'default' : 'outline'}
              onClick={() => {
                if (!isDrawingFeatureUnderConstruction) {
                  setActiveView('drawing');
                } else {
                  showError("The drawing pad is currently under construction.");
                }
              }}
              className={cn("flex-1", isDrawingFeatureUnderConstruction && "text-muted-foreground cursor-not-allowed")}
            >
              <ImageIcon className="mr-2 h-4 w-4" /> Drawing Pad
            </Button>
          </div>

          <div className="min-h-[500px] rounded-lg border p-4">
            {activeView === 'editor' && (
              <div className="flex h-full flex-col">
                <Label htmlFor="content" className="text-lg mb-2 block">Text Editor Content</Label>
                <RichTextEditor
                  content={richTextContent}
                  onContentChange={setRichTextContent}
                  editorRef={editorRef}
                />
                <Button
                  type="button"
                  onClick={handleSummarizeNote}
                  className="mt-4 w-full"
                  disabled={!richTextContent.trim() || isSaving}
                >
                  <FileText className="mr-2 h-4 w-4" /> Summarize with AI
                </Button>
              </div>
            )}

            {activeView === 'drawing' && (
              <NoteDrawingSection
                editorRef={editorRef}
                initialDrawingUrl={drawingUrl}
                onDrawingSaved={setDrawingUrl}
              />
            )}
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-6">
            <Button type="submit" className="flex-1" disabled={isSaving}>
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
            <Button type="button" variant="outline" onClick={() => navigate(`/notes`)} className="flex-1">Cancel</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditNote;