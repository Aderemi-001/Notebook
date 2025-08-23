import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NotebookCard, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/NotebookCard";
import { ArrowLeft, Brain, Save, Loader2, FileText, Pencil, Eraser, ZoomIn, ZoomOut, Move } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Editor } from "@tiptap/react";
import { useAIDrawingAnalysis } from "@/hooks/use-ai-drawing-analysis";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TextEditorContent from "@/components/TextEditorContent";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDrawingCanvas } from "@/hooks/use-drawing-canvas";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStudySets } from "@/hooks/use-user-study-sets";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  study_set_id: z.string().nullable().optional(),
});

type CreateNoteFormValues = z.infer<typeof formSchema>;

const CreateNote: React.FC = () => {
  const [richTextContent, setRichTextContent] = useState<string>("");
  const [drawingUrl, setDrawingUrl] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const editorRef = useRef<Editor | null>(null);

  const { data: userStudySets, isLoading: isLoadingStudySets } = useUserStudySets();

  const form = useForm<CreateNoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      study_set_id: null,
    },
  });

  // Drawing canvas state and hooks
  const [isDrawingMode, setIsDrawingMode] = useState(true);
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [penSize, setPenSize] = useState(5);
  const [isErasing, setIsErasing] = useState(false);
  const [eraserSize, setEraserSize] = useState(10);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const {
    canvasRef,
    startDrawing,
    draw,
    endDrawing,
    clearCanvas,
  } = useDrawingCanvas({
    isDrawingMode,
    drawingColor,
    penSize,
    isErasing,
    eraserSize,
    zoomLevel,
    setZoomLevel,
    panOffset,
    setPanOffset,
    minZoom: 0.5,
    maxZoom: 3,
    onCanvasClickDetected: () => { /* No specific action on click for now */ },
  });

  const insertTextIntoEditor = (text: string) => {
    if (editorRef.current) {
      editorRef.current.chain().focus().insertContent(text).run();
      setRichTextContent(editorRef.current.getHTML());
    }
  };

  const {
    showReplaceDialog,
    setShowReplaceDialog,
    textToReplace,
    analyzeDrawing,
    handleConfirmReplace,
    handleCancelReplace,
    isAnalyzing,
  } = useAIDrawingAnalysis({ editor: editorRef.current, insertTextIntoEditor });

  const handleSaveDrawing = async (dataUrl: string) => {
    if (!user) {
      showError("You must be logged in to save a drawing.");
      return;
    }

    const toastId = showLoading("Uploading drawing...");
    try {
      const base64Image = dataUrl.split(',')[1];
      const mimeType = dataUrl.split(';')[0].split(':')[1];

      const extractedContent = await analyzeDrawing(base64Image, mimeType);

      if (extractedContent) {
        setDrawingUrl(dataUrl);
      }
      dismissToast(toastId);
      showSuccess("Drawing processed!");
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to process drawing.");
      console.error("Drawing processing error:", error);
    }
  };

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

      insertTextIntoEditor(`\n\n--- AI Summary ---\n${result.summary}\n---`);
      showSuccess("Note summarized successfully!");
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "An unexpected error occurred during summarization.");
      console.error("Note summarization error:", err);
    }
  };

  const onSubmit = async (values: CreateNoteFormValues) => {
    if (!user) {
      showError("You must be logged in to create a note.");
      return;
    }

    setIsSaving(true);
    const toastId = showLoading("Creating note...");

    try {
      const { data, error } = await supabase
        .from("notes")
        .insert([{
          user_id: user.id,
          title: values.title,
          content: editorRef.current?.getJSON(), // Save Tiptap JSON content
          drawing_url: drawingUrl,
          study_set_id: values.study_set_id,
        }])
        .select();

      if (error) throw error;

      showSuccess("Note created successfully!");
      navigate(`/notes/${data[0].id}/edit`);
    } catch (error: any) {
      console.error("Error creating note:", error);
      showError(`Failed to create note: ${error.message}`);
    } finally {
      dismissToast(toastId);
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Create New Note</h1>
        <Button asChild variant="outline">
          <Link to="/notes" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Notes
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <NotebookCard className="mb-6">
            <CardHeader>
              <CardTitle>Note Details</CardTitle>
              <CardDescription>Enter the title and content for your new note.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Note Title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="study_set_id"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Link to Study Set (Optional)</FormLabel>
                    <Select onValueChange={(value: string) => field.onChange(value === "null" ? null : value)} value={field.value || "null"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a study set" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">No Study Set</SelectItem>
                        {isLoadingStudySets ? (
                          <SelectItem disabled value="loading">Loading study sets...</SelectItem>
                        ) : userStudySets?.length === 0 ? (
                          <SelectItem disabled value="no-sets">No study sets available</SelectItem>
                        ) : (
                          userStudySets?.map((set) => (
                            <SelectItem key={set.id} value={set.id}>
                              {set.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </NotebookCard>

          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-[500px] rounded-lg border"
          >
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full flex-col p-4">
                <Label htmlFor="content" className="text-lg mb-2 block">Rich Text Content</Label>
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
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              <div className="flex h-full flex-col p-4">
                <Label className="text-lg mb-2 block">Drawing Canvas</Label>
                <div className="relative border rounded-md overflow-hidden flex-grow bg-white">
                  <TextEditorContent editor={editorRef.current} editable={false} isDrawingMode={isDrawingMode} />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                    style={{
                      transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                      transformOrigin: '0 0',
                      pointerEvents: isDrawingMode ? 'auto' : 'none',
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4 p-2 border rounded-md bg-muted/20">
                  <ToggleGroup type="single" value={isDrawingMode ? 'draw' : 'pan'} onValueChange={(value) => setIsDrawingMode(value === 'draw')}>
                    <ToggleGroupItem value="draw" aria-label="Toggle drawing mode">
                      <Pencil className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pan" aria-label="Toggle pan mode">
                      <Move className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>

                  {isDrawingMode && (
                    <>
                      <ToggleGroup type="single" value={isErasing ? 'eraser' : 'pen'} onValueChange={(value) => setIsErasing(value === 'eraser')}>
                        <ToggleGroupItem value="pen" aria-label="Toggle pen">
                          <Pencil className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="eraser" aria-label="Toggle eraser">
                          <Eraser className="h-4 w-4" />
                        </ToggleGroupItem>
                      </ToggleGroup>
                      <input
                        type="color"
                        value={drawingColor}
                        onChange={(e) => setDrawingColor(e.target.value)}
                        className="w-10 h-10 p-1 border rounded-md cursor-pointer"
                        title="Select brush color"
                        disabled={isErasing}
                      />
                      <Slider
                        min={1}
                        max={20}
                        step={1}
                        value={[isErasing ? eraserSize : penSize]}
                        onValueChange={(val) => isErasing ? setEraserSize(val[0]) : setPenSize(val[0])}
                        className="w-[100px]"
                      />
                    </>
                  )}

                  {!isDrawingMode && (
                    <>
                      <Button variant="outline" size="icon" onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 3))}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setZoomLevel(prev => Math.min(prev - 0.1, 0.5))}>
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button onClick={clearCanvas}>Clear Drawing</Button>
                  <Button onClick={() => handleSaveDrawing(canvasRef.current?.toDataURL('image/png') || '')} disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" /> Analyze Drawing
                      </>
                    )}
                  </Button>
                </div>
                {drawingUrl && (
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold mb-2">Current Drawing:</h3>
                    <img src={drawingUrl} alt="Current Drawing" className="max-w-full h-auto border rounded-md" />
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-6">
            <Button type="submit" className="flex-1" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Note...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Create Note
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(`/notes`)} className="flex-1">Cancel</Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI Extracted Text</AlertDialogTitle>
            <AlertDialogDescription>
              The AI extracted the following text from your drawing. Would you like to insert it into your note?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[200px] overflow-y-auto p-4 border rounded-md bg-muted/50 text-sm">
            <p className="whitespace-pre-wrap">{textToReplace}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReplace}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace}>Insert Text</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreateNote;