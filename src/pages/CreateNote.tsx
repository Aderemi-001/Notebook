import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
// import DrawingCanvas from "@/components/DrawingCanvas"; // This component will be replaced by the integrated canvas logic
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

const CreateNote: React.FC = () => {
  const [title, setTitle] = useState("");
  const [richTextContent, setRichTextContent] = useState<string>("");
  const [drawingUrl, setDrawingUrl] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const editorRef = useRef<Editor | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
          title,
          content: editorRef.current?.getJSON(), // Save Tiptap JSON content
          drawing_url: drawingUrl
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

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Note Details</CardTitle>
          <CardDescription>Enter the title and content for your new note.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title" className="text-lg">Title</Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note Title"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="content" className="text-lg mb-2 block">Content</Label>
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
            <div>
              <Label className="text-lg mb-2 block">Drawing Canvas</Label>
              <div className="relative border rounded-md overflow-hidden w-full h-[400px] bg-white">
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
            <Button type="submit" className="w-full" disabled={isSaving}>
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
          </form>
        </CardContent>
      </NotebookCard>

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