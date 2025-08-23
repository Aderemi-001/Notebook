import React from 'react';
import { Editor } from '@tiptap/react';
import DrawingModeToggle from '@/components/rich-text-editor-toolbar/DrawingModeToggle';
import HighlightControls from '@/components/rich-text-editor-toolbar/HighlightControls';
import DrawingControls from '@/components/rich-text-editor-toolbar/DrawingControls'; // Import DrawingControls
import { Separator } from '@/components/ui/separator'; // Keep Separator for visual separation

interface UtilityControlsProps {
  editor: Editor;
  isDrawingMode: boolean;
  setIsDrawingMode: (isDrawingMode: boolean) => void;
  drawingColor: string;
  setDrawingColor: (color: string) => void;
  penSize: number;
  setPenSize: (size: number) => void;
  isErasing: boolean;
  setIsErasing: (erasing: boolean) => void;
  eraserSize: number;
  setEraserSize: (size: number) => void;
  clearCanvas: () => void;
  insertDrawing: () => void;
  analyzeDrawing: () => void;
  zoomLevel: number;
  setZoomLevel: (level: number | ((prev: number) => number)) => void;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
}

const UtilityControls: React.FC<UtilityControlsProps> = ({
  editor,
  isDrawingMode,
  setIsDrawingMode,
  drawingColor,
  setDrawingColor,
  penSize,
  setPenSize,
  isErasing,
  setIsErasing,
  eraserSize,
  setEraserSize,
  clearCanvas,
  insertDrawing,
  analyzeDrawing,
  zoomLevel,
  setZoomLevel,
  minZoom,
  maxZoom,
  zoomStep,
}) => {
  return (
    <div className="flex items-center gap-1">
      <HighlightControls editor={editor} />
      <Separator orientation="vertical" className="h-6" />
      <DrawingModeToggle
        isDrawingMode={isDrawingMode}
        setIsDrawingMode={setIsDrawingMode}
        drawingColor={drawingColor}
      />
      {isDrawingMode && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <DrawingControls
            drawingColor={drawingColor}
            setDrawingColor={setDrawingColor}
            penSize={penSize}
            setPenSize={setPenSize}
            isErasing={isErasing}
            setIsErasing={setIsErasing}
            eraserSize={eraserSize}
            setEraserSize={setEraserSize}
            clearCanvas={clearCanvas}
            insertDrawing={insertDrawing}
            analyzeDrawing={analyzeDrawing}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            minZoom={minZoom}
            maxZoom={maxZoom}
            zoomStep={zoomStep}
          />
        </>
      )}
    </div>
  );
};

export default UtilityControls;