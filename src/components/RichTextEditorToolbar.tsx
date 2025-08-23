import React from 'react';
import { Editor } from '@tiptap/react';
import DrawingModeToggle from './rich-text-editor-toolbar/DrawingModeToggle';
import TextFormattingControls from './rich-text-editor-toolbar/TextFormattingControls';
import HighlightControls from './rich-text-editor-toolbar/HighlightControls';
import ListFormattingControls from './rich-text-editor-toolbar/ListFormattingControls';
import MoreFormattingControls from './rich-text-editor-toolbar/MoreFormattingControls';
import UndoRedoControls from './rich-text-editor-toolbar/UndoRedoControls';
import DrawingControls from './rich-text-editor-toolbar/DrawingControls';
import HeadingControls from './rich-text-editor-toolbar/HeadingControls'; // New: Import HeadingControls
import AlignmentControls from './rich-text-editor-toolbar/AlignmentControls'; // New: Import AlignmentControls
import LinkControls from './rich-text-editor-toolbar/LinkControls'; // New: Import LinkControls
import ImageControls from './rich-text-editor-toolbar/ImageControls'; // New: Import ImageControls
import { Separator } from '@/components/ui/separator'; // New: Import Separator

interface RichTextEditorToolbarProps {
  editor: Editor; // Editor is guaranteed to be non-null by parent
  isDrawingMode: boolean;
  setIsDrawingMode: (mode: boolean) => void;
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
  return (
    <div className="flex flex-nowrap w-full border-b overflow-x-auto scrollbar-hide px-2 py-1 items-center gap-1">
      <DrawingModeToggle isDrawingMode={isDrawingMode} setIsDrawingMode={setIsDrawingMode} />

      <Separator orientation="vertical" className="h-6" />

      {isDrawingMode ? (
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
      ) : (
        <>
          <HeadingControls editor={editor} />
          <Separator orientation="vertical" className="h-6" />
          <TextFormattingControls editor={editor} />
          <HighlightControls editor={editor} />
          <ListFormattingControls editor={editor} />
          <AlignmentControls editor={editor} />
          <LinkControls editor={editor} />
          <ImageControls editor={editor} />
          <MoreFormattingControls editor={editor} />
          <Separator orientation="vertical" className="h-6" />
          <UndoRedoControls editor={editor} />
        </>
      )}
    </div>
  );
};

export default RichTextEditorToolbar;