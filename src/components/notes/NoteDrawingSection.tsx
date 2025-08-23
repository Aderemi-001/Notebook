import * as React from 'react';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Pencil, Eraser, ZoomIn, ZoomOut, Move, Brain, Loader2 } from 'lucide-react';
// import TextEditorContent from "@/components/TextEditorContent"; // This import is no longer needed here
import { Editor } from "@tiptap/react";
import { useDrawingCanvas } from "@/hooks/use-drawing-canvas";
import { useAIDrawingAnalysis } from "@/hooks/use-ai-drawing-analysis";
import { useAuth } from '@/hooks/useAuth';
import { showError } from '@/utils/toast';
import AIExtractedTextDialog from './AIExtractedTextDialog';

interface NoteDrawingSectionProps {
  editorRef: React.MutableRefObject<Editor | null>;
  initialDrawingUrl?: string;
  onDrawingSaved: (dataUrl: string | undefined) => void;
}

const NoteDrawingSection: React.FC<NoteDrawingSectionProps> = ({
  editorRef,
  initialDrawingUrl,
  onDrawingSaved,
}) => {
  const { user } = useAuth();

  // Drawing canvas state and hooks
  const [toolMode, setToolMode] = useState<'pen' | 'eraser' | 'pan'>('pen');
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [penSize, setPenSize] = useState(5);
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
    toolMode,
    drawingColor,
    penSize,
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
      // Note: The parent component (EditNote/CreateNote) will handle updating richTextContent state
      // based on editorRef.current.getHTML() via the RichTextEditor's onContentChange.
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

  const handleAnalyzeDrawing = async () => {
    if (!user) {
      showError("You must be logged in to analyze a drawing.");
      return;
    }
    if (!canvasRef.current) {
      showError("No drawing canvas found.");
      return;
    }

    const dataUrl = canvasRef.current.toDataURL('image/png');
    const base64Image = dataUrl.split(',')[1];
    const mimeType = dataUrl.split(';')[0].split(':')[1];

    const extractedContent = await analyzeDrawing(base64Image, mimeType);

    if (extractedContent) {
      onDrawingSaved(dataUrl); // Update parent with new drawing URL
    }
  };

  const handleClearCanvas = () => {
    clearCanvas();
    onDrawingSaved(undefined); // Clear drawing URL in parent
  };

  return (
    <div className="flex h-full flex-col p-4">
      <Label className="text-lg mb-2 block">Drawing Canvas</Label>
      <div className="relative border rounded-md overflow-hidden flex-grow bg-white">
        {/* TextEditorContent was removed from here as it was obscuring the canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair touch-none bg-white"
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
            pointerEvents: toolMode !== 'pan' ? 'auto' : 'none',
          }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 p-2 border rounded-md bg-muted/20">
        <ToggleGroup type="single" value={toolMode} onValueChange={(value: 'pen' | 'eraser' | 'pan') => setToolMode(value)}>
          <ToggleGroupItem value="pen" aria-label="Pen tool">
            <Pencil className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="eraser" aria-label="Eraser tool">
            <Eraser className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="pan" aria-label="Pan tool">
            <Move className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        {toolMode === 'pen' && (
          <>
            <input
              type="color"
              value={drawingColor}
              onChange={(e) => setDrawingColor(e.target.value)}
              className="w-10 h-10 p-1 border rounded-md cursor-pointer"
              title="Select brush color"
            />
            <Slider
              min={1}
              max={20}
              step={1}
              value={[penSize]}
              onValueChange={(val) => setPenSize(val[0])}
              className="w-[100px]"
            />
          </>
        )}

        {toolMode === 'eraser' && (
          <Slider
            min={1}
            max={20}
            step={1}
            value={[eraserSize]}
            onValueChange={(val) => setEraserSize(val[0])}
            className="w-[100px]"
          />
        )}

        {toolMode === 'pan' && (
          <>
            <Button variant="outline" size="icon" onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 3))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setZoomLevel(prev => Math.min(prev - 0.1, 0.5))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </>
        )}
        <Button onClick={handleClearCanvas}>Clear Drawing</Button>
        <Button onClick={handleAnalyzeDrawing} disabled={isAnalyzing}>
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
      {initialDrawingUrl && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold mb-2">Current Drawing:</h3>
          <img src={initialDrawingUrl} alt="Current Drawing" className="max-w-full h-auto border rounded-md" />
        </div>
      )}

      <AIExtractedTextDialog
        open={showReplaceDialog}
        onOpenChange={setShowReplaceDialog}
        textToReplace={textToReplace}
        onConfirm={handleConfirmReplace}
        onCancel={handleCancelReplace}
      />
    </div>
  );
};

export default NoteDrawingSection;