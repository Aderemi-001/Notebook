import React from 'react';
import { Editor } from '@tiptap/react';
import { Separator } from '@/components/ui/separator';
import TextFormattingControls from '@/components/rich-text-editor-toolbar/TextFormattingControls';
import BlockControls from '@/components/rich-text-editor-toolbar/BlockControls';
import ListControls from '@/components/rich-text-editor-toolbar/ListControls';
import HistoryControls from '@/components/rich-text-editor-toolbar/HistoryControls';
import UtilityControls from '@/components/rich-text-editor-toolbar/UtilityControls';
import DrawingControls from '@/components/rich-text-editor-toolbar/DrawingControls'; // Import the new DrawingControls

interface RichTextEditorToolbarProps {
  editor: Editor | null;
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

const RichTextEditorToolbar: React.FC<RichTextEditorToolbarProps> = ({
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
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-nowrap w-full border-b overflow-x-auto scrollbar-hide px-2 py-1 items-center gap-1">
      <TextFormattingControls editor={editor} />
      <Separator orientation="vertical" className="h-6" />
      <BlockControls editor={editor} />
      <Separator orientation="vertical" className="h-6" />
      <ListControls editor={editor} />
      <Separator orientation="vertical" className="h-6" />
      <HistoryControls editor={editor} />
      <Separator orientation="vertical" className="h-6" />
      <UtilityControls
        editor={editor}
        isDrawingMode={isDrawingMode}
        setIsDrawingMode={setIsDrawingMode}
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

export default RichTextEditorToolbar;