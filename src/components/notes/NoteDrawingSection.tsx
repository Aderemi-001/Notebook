import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Brain, Loader2, Hammer } from 'lucide-react';
// Removed unused imports: Slider, ToggleGroup, ToggleGroupItem, Pencil, Eraser, ZoomIn, ZoomOut, Move
import { Editor } from "@tiptap/react";
// Removed unused hook: useDrawingCanvas
import { useAIDrawingAnalysis } from "@/hooks/use-ai-drawing-analysis";
// Removed unused hook: useAuth
import { showError } from '@/utils/toast';
import AIExtractedTextDialog from './AIExtractedTextDialog';

interface NoteDrawingSectionProps {
  editorRef: React.MutableRefObject<Editor | null>;
  initialDrawingUrl?: string; // Still kept in interface for potential future use
  onDrawingSaved: (dataUrl: string | undefined) => void; // Still kept in interface for potential future use
}

const NoteDrawingSection: React.FC<NoteDrawingSectionProps> = ({
  editorRef,
  // Removed unused prop: initialDrawingUrl
  // Removed unused prop: onDrawingSaved
}) => {
  // Removed unused variable: user from useAuth()
  // Removed unused state variables: toolMode, setToolMode, drawingColor, setDrawingColor, penSize, setPenSize, eraserSize, setEraserSize, zoomLevel, setZoomLevel, panOffset, setPanOffset

  // Removed unused hook: useDrawingCanvas and its destructured values

  const insertTextIntoEditor = (text: string) => {
    if (editorRef.current) {
      editorRef.current.chain().focus().insertContent(text).run();
    }
  };

  const {
    showReplaceDialog,
    setShowReplaceDialog,
    textToReplace,
    // Removed unused variable: analyzeDrawing
    handleConfirmReplace,
    handleCancelReplace,
    isAnalyzing,
  } = useAIDrawingAnalysis({ editor: editorRef.current, insertTextIntoEditor });

  const handleAnalyzeDrawing = async () => {
    showError("Drawing analysis is currently under construction.");
  };

  const handleClearCanvas = () => {
    showError("Drawing features are currently under construction.");
  };

  return (
    <div className="flex h-full flex-col p-4">
      <Label className="text-lg mb-2 block">Drawing Canvas</Label>
      <div className="relative border rounded-md overflow-hidden flex-grow bg-white flex items-center justify-center text-center">
        <div className="text-muted-foreground p-4">
          <Hammer className="h-16 w-16 text-primary mb-4 mx-auto" />
          <h2 className="text-xl font-semibold">Drawing Pad Under Construction!</h2>
          <p className="mt-2">We're working hard to bring you this feature. Please check back soon!</p>
        </div>
        {/* The canvas and its controls are hidden when under construction */}
        {/*
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
        */}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 p-2 border rounded-md bg-muted/20">
        {/* Removed ToggleGroup and its items */}
        {/* Removed conditional rendering for pen, eraser, and pan tools */}
        <Button onClick={handleClearCanvas} disabled>Clear Drawing</Button>
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
      {/* Initial drawing URL display also hidden */}
      {/*
      {initialDrawingUrl && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold mb-2">Current Drawing:</h3>
          <img src={initialDrawingUrl} alt="Current Drawing" className="max-w-full h-auto border rounded-md" />
        </div>
      )}
      */}

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