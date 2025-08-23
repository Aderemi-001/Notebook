import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, JSONContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import RichTextEditorToolbar from './RichTextEditorToolbar';
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

import { useDrawingCanvas } from '@/hooks/use-drawing-canvas';
import { useAIDrawingAnalysis } from '@/hooks/use-ai-drawing-analysis';
import DrawingCanvas from './DrawingCanvas';
import TextEditorContent from './TextEditorContent';

interface RichTextEditorProps {
  content: JSONContent | string;
  onContentChange: (content: JSONContent) => void;
  editable?: boolean;
  className?: string;
  labelId?: string;
  isDrawingMode: boolean;
  setIsDrawingMode: (mode: boolean) => void;
  onEditorReady?: (
    editor: Editor,
    analyzeDrawing: () => Promise<void>,
    insertDrawing: () => void
  ) => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;
const BASE_PEN_SIZE = 5;
const BASE_ERASER_SIZE = 15;

const generateEraserCursor = (size: number) => {
  const radius = size / 2;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${radius}" cy="${radius}" r="${radius - 0.5}" stroke="black" stroke-width="1" fill="none" />
    </svg>
  `;
  const encodedSvg = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `url("data:image/svg+xml;utf8,${encodedSvg}") ${radius} ${radius}, none`;
};

const generatePenCursor = () => {
  const svg = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      <path d="m15 5 4 4"/>
    </svg>
  `;
  const encodedSvg = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `url("data:image/svg+xml;utf8,${encodedSvg}") 0 24, auto`;
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onContentChange,
  editable = true,
  className,
  labelId,
  isDrawingMode,
  setIsDrawingMode,
  onEditorReady,
}) => {
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [penSize, setPenSize] = useState(BASE_PEN_SIZE);
  const [isErasing, setIsErasing] = useState(false);
  const [eraserSize, setEraserSize] = useState(BASE_ERASER_SIZE);
  const [customCursorStyle, setCustomCursorStyle] = useState('crosshair');

  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-gray-300 pl-4 italic text-muted-foreground',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm overflow-x-auto',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'mb-2',
          },
        },
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            1: { class: 'text-3xl font-bold mb-4 mt-6' },
            2: { class: 'text-2xl font-semibold mb-3 mt-5' },
            3: { class: 'text-xl font-semibold mb-2 mt-4' },
            4: { class: 'text-lg font-semibold mb-1 mt-3' },
            5: { class: 'text-base font-semibold mb-1 mt-2' },
            6: { class: 'text-sm font-semibold mb-1 mt-1' },
          },
        },
      }),
      Highlight.configure({
        multicolor: true, // Re-enabled multicolor
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-baseline gap-2',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-blue-500 underline hover:text-blue-600',
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON());
    },
    editable: editable && !isDrawingMode, // Editor is editable only if not in drawing mode
  });

  const handleCanvasClickDetected = useCallback(() => {
    if (editor && isDrawingMode) {
      setIsDrawingMode(false);
      editor.chain().focus().run();
    }
  }, [editor, isDrawingMode, setIsDrawingMode]);

  const {
    canvasRef,
    clearCanvas,
    startDrawing,
    draw,
    endDrawing,
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
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    onCanvasClickDetected: handleCanvasClickDetected,
  });

  const {
    showReplaceDialog,
    setShowReplaceDialog,
    textToReplace,
    insertDrawing,
    analyzeDrawing,
    handleConfirmReplace,
    handleCancelReplace,
  } = useAIDrawingAnalysis({
    editor,
    canvasRef,
    setIsDrawingMode,
    clearCanvas,
  });

  useEffect(() => {
    if (isDrawingMode) {
      if (isErasing) {
        setCustomCursorStyle(generateEraserCursor(eraserSize));
      } else {
        setCustomCursorStyle(generatePenCursor());
      }
    } else {
      setCustomCursorStyle('auto');
    }
  }, [isDrawingMode, isErasing, eraserSize]);

  // Effect to explicitly set editor editable state and focus
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable && !isDrawingMode);
      if (!isDrawingMode) {
        // When exiting drawing mode, focus the editor
        editor.chain().focus().run();
      }
    }
  }, [editor, editable, isDrawingMode]);


  // Effect to expose editor instance and AI drawing functions
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor, analyzeDrawing, insertDrawing);
    }
  }, [editor, onEditorReady, analyzeDrawing, insertDrawing]);

  // NEW: Effect to update editor content when the 'content' prop changes
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [editor, content]);

  return (
    <div className="w-full flex flex-col">
      {editor && (
        <>
          {editable && (
            <RichTextEditorToolbar
              editor={editor}
              isDrawingMode={isDrawingMode}
              setIsDrawingMode={setIsDrawingMode}
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
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              zoomStep={ZOOM_STEP}
            />
          )}
          <div className="relative border rounded-md overflow-hidden min-h-[300px] flex-grow">
            <TextEditorContent
              editor={editor}
              editable={editable}
              className={className}
              labelId={labelId}
              isDrawingMode={isDrawingMode}
            />

            <DrawingCanvas
              canvasRef={canvasRef}
              isDrawingMode={isDrawingMode}
              customCursorStyle={customCursorStyle}
              zoomLevel={zoomLevel}
              panOffset={panOffset}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={endDrawing}
            />
          </div>
        </>
      )}

      <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insert Transcribed Text?</AlertDialogTitle>
            <AlertDialogDescription>
              The AI has transcribed your drawing:
              <blockquote className="mt-4 border-l-4 pl-4 italic text-muted-foreground">
                "{textToReplace}"
              </blockquote>
              Do you want to insert this text at the end of your note?
              This action will add the transcribed text without removing existing content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReplace}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace}>Insert</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RichTextEditor;