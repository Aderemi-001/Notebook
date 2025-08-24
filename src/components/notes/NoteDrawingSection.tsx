import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Brain, Loader2, Eraser as EraserIcon } from 'lucide-react';
import { Editor } from "@tiptap/react";
import { useAIDrawingAnalysis } from "@/hooks/use-ai-drawing-analysis";
import { showError } from '@/utils/toast';
import AIExtractedTextDialog from './AIExtractedTextDialog';
import DrawingCanvas, { DrawingCanvasRef } from '@/components/DrawingCanvas';
import { cn } from '@/lib/utils'; // Import cn for conditional styling

interface NoteDrawingSectionProps {
  editorRef: React.MutableRefObject<Editor | null>;
  initialDrawingUrl?: string;
  onDrawingSaved: (dataUrl: string | undefined) => void;
  isDrawingMode: boolean; // New prop
}

const NoteDrawingSection: React.FC<NoteDrawingSectionProps> = ({
  editorRef,
  initialDrawingUrl,
  onDrawingSaved,
  isDrawingMode, // Destructure new prop
}) => {
  const drawingCanvasRef = React.useRef<DrawingCanvasRef>(null);

  const insertTextIntoEditor = (text: string) => {
    if (editorRef.current) {
      editorRef.current.chain().focus().insertContent(text).run();
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
    if (!drawingCanvasRef.current) {
      showError("Drawing canvas not ready.");
      return;
    }
    const dataUrl = drawingCanvasRef.current.getImageDataURL();
    if (!dataUrl || dataUrl === 'data:,' || dataUrl === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAAAXNSR0IArs4c6QAAAEtJREFUeF7t0AEBAAAAgsD/S2AHJwagAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwZ3gAbQp+mQAAAABJRU5ErkJggg==') {
      showError("Please draw something on the canvas before analyzing.");
      return;
    }

    const [mimeType, base64Image] = dataUrl.split(';base64,');
    if (!base64Image || !mimeType) {
      showError("Could not extract image data for analysis.");
      return;
    }
    
    await analyzeDrawing(base64Image, mimeType.replace('data:', ''));
  };

  const handleClearCanvas = () => {
    if (drawingCanvasRef.current) {
      drawingCanvasRef.current.clearCanvas();
      onDrawingSaved(undefined);
    }
  };

  return (
    <div className={cn(
      "absolute inset-0 flex flex-col p-4 transition-opacity duration-300",
      isDrawingMode ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
    )}>
      <Label className="text-lg mb-2 block">Drawing Canvas</Label>
      <div className="relative border rounded-md overflow-hidden flex-grow bg-white">
        <DrawingCanvas
          ref={drawingCanvasRef}
          initialImage={initialDrawingUrl}
          onSave={onDrawingSaved}
          editable={isDrawingMode} // Pass editable state to DrawingCanvas
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 p-2 border rounded-md bg-muted/20">
        <Button onClick={handleClearCanvas} disabled={!isDrawingMode}>
          <EraserIcon className="mr-2 h-4 w-4" /> Clear Drawing
        </Button>
        <Button
          onClick={handleAnalyzeDrawing}
          disabled={isAnalyzing || !isDrawingMode}
          variant="outline"
        >
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