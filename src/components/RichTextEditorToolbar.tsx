import React from 'react';
import { Editor } from '@tiptap/react';
import DrawingModeToggle from './rich-text-editor-toolbar/DrawingModeToggle';
import TextFormattingControls from './rich-text-editor-toolbar/TextFormattingControls';
import HighlightControls from './rich-text-editor-toolbar/HighlightControls';
import ListFormattingControls from './rich-text-editor-toolbar/ListFormattingControls';
import MoreFormattingControls from './rich-text-editor-toolbar/MoreFormattingControls';
import UndoRedoControls from './rich-text-editor-toolbar/UndoRedoControls';
import DrawingControls from './rich-text-editor-toolbar/DrawingControls';

interface RichTextEditorToolbarProps {
  editor: Editor; // Editor is guaranteed to be non-null by parent
  isDrawingMode: boolean;
  setIsDrawingMode: (mode: boolean) => void;
  drawingColor: string;
  setDrawingColor: (color: string) => void;
  penSize: number; // New prop
  setPenSize: (size: number) => void; // New prop
  isErasing: boolean; // New prop
  setIsErasing: (erasing: boolean) => void; // New prop
  eraserSize: number; // New prop
  setEraserSize: (size: number) => void; // New prop
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
  penSize, // Destructure penSize
  setPenSize, // Destructure setPenSize
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
  // The parent component (RichTextEditor) now ensures 'editor' is not null before rendering this component.
  // So, this check is no longer necessary here.

  return (
    <div className="flex flex-nowrap w-full border-b overflow-x-auto scrollbar-hide px-2 py-1">
      <DrawingModeToggle isDrawingMode={isDrawingMode} setIsDrawingMode={setIsDrawingMode} />

      {isDrawingMode ? (
        <DrawingControls
          drawingColor={drawingColor}
          setDrawingColor={setDrawingColor}
          penSize={penSize} // Pass penSize
          setPenSize={setPenSize} // Pass setPenSize
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
      ) : (
        <>
          <TextFormattingControls editor={editor} />
          <HighlightControls editor={editor} />
          <ListFormattingControls editor={editor} />
          <MoreFormattingControls editor={editor} />
          <UndoRedoControls editor={editor} />
        </>
      )}
    </div>
  );
};

export default RichTextEditorToolbar;