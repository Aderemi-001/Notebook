import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image'; // Import Image extension
import { cn } from '@/lib/utils';
import RichTextEditorToolbar from './RichTextEditorToolbar';

interface RichTextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  editable?: boolean;
  className?: string;
  onDrawingAnalyzed?: (extractedText: string) => void; // New prop for AI analysis callback
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onContentChange, editable = true, className, onDrawingAnalyzed }) => {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#000000'); // Default to black
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-baseline gap-2',
        },
      }),
      Image.configure({ // Configure Image extension
        inline: true,
        allowBase64: true, // Allow base64 images
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    editable: editable && !isDrawingMode, // Disable Tiptap editing when in drawing mode
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4 border rounded-md',
          'user-select-text touch-action-auto',
          (!editable || isDrawingMode) && 'bg-muted/50 cursor-not-allowed', // Apply disabled styles
          className
        ),
      },
    },
  });

  // Initialize canvas context and clear when entering drawing mode
  useEffect(() => {
    if (isDrawingMode && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctxRef.current = ctx;

        // Set canvas dimensions to match its display size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Clear canvas when entering drawing mode to ensure a fresh start
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isDrawingMode]);

  // Drawing functions
  const startDrawing = useCallback(({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
    if (!ctxRef.current) return;
    const { offsetX, offsetY } = 'touches' in nativeEvent ? getTouchPos(nativeEvent, canvasRef.current!) : nativeEvent;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  }, []);

  const draw = useCallback(({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !ctxRef.current) return;
    const { offsetX, offsetY } = 'touches' in nativeEvent ? getTouchPos(nativeEvent, canvasRef.current!) : nativeEvent;
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.strokeStyle = drawingColor;
    ctxRef.current.stroke();
  }, [isDrawing, drawingColor]);

  const endDrawing = useCallback(() => {
    if (!ctxRef.current) return;
    ctxRef.current.closePath();
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    if (canvasRef.current && ctxRef.current) {
      ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  const insertDrawing = useCallback(() => {
    if (editor && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      editor.chain().focus().setImage({ src: dataUrl }).run();
      clearCanvas(); // Clear canvas after inserting
      setIsDrawingMode(false); // Exit drawing mode
    }
  }, [editor, clearCanvas]);

  const analyzeDrawing = useCallback(() => {
    if (canvasRef.current && onDrawingAnalyzed) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      // Extract base64 string and mime type
      const [mimeTypePart, base64Data] = dataUrl.split(',');
      const mimeType = mimeTypePart.split(':')[1].split(';')[0];
      onDrawingAnalyzed(base64Data); // Pass base64 data to parent for AI analysis
      // Optionally clear canvas after analysis if user is expected to draw something new
      // clearCanvas(); // Consider adding this if the workflow implies a new drawing after analysis
    }
  }, [onDrawingAnalyyzed]);

  // Helper to get touch position relative to canvas
  const getTouchPos = (e: React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
    };
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full">
      {editable && (
        <RichTextEditorToolbar
          editor={editor}
          isDrawingMode={isDrawingMode}
          setIsDrawingMode={setIsDrawingMode}
          drawingColor={drawingColor}
          setDrawingColor={setDrawingColor}
          clearCanvas={clearCanvas}
          insertDrawing={insertDrawing}
          analyzeDrawing={analyzeDrawing} // Pass the new function
        />
      )}
      <div className="relative border rounded-md">
        {isDrawingMode && editable ? (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full bg-white dark:bg-gray-900 z-10 cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
            style={{ touchAction: 'none' }} // Prevent scrolling/zooming on touch
          />
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default RichTextEditor;