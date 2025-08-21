import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor, EditorContent, Editor, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/utils';
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
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface RichTextEditorProps {
  content: JSONContent | string; // Can be JSONContent or initial HTML string
  onContentChange: (content: JSONContent) => void; // Now expects JSONContent
  editable?: boolean;
  className?: string;
  labelId?: string;
  onEditorReady?: (editor: Editor) => void; // New prop to expose editor instance
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;
const BASE_LINE_WIDTH = 3;
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

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onContentChange, editable = true, className, labelId, onEditorReady }) => {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [isErasing, setIsErasing] = useState(false);
  const [eraserSize, setEraserSize] = useState(BASE_ERASER_SIZE);
  const [customCursorStyle, setCustomCursorStyle] = useState('crosshair');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [textToReplace, setTextToReplace] = useState('');

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
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: content, // This will now correctly handle JSONContent or initial HTML string
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON()); // Pass JSON content
    },
    editable: editable && !isDrawingMode,
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
          'user-select-text touch-action-auto',
          !editable && 'bg-muted/50 cursor-not-allowed',
          className
        ),
        'aria-labelledby': labelId || '',
      },
    },
  });

  const clearCanvas = useCallback(() => {
    if (canvasRef.current && ctxRef.current) {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    const parentDiv = canvas.parentElement;
    if (parentDiv) {
      canvas.width = parentDiv.clientWidth;
      canvas.height = parentDiv.clientHeight;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === canvas) {
          const { width, height } = entry.contentRect;
          if (canvas.width !== width || canvas.height !== height) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            canvas.width = width;
            canvas.height = height;
            ctx.putImageData(imageData, 0, 0);
          }
        }
      }
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.unobserve(canvas);
    };
  }, []);

  // New effect to clear canvas when exiting drawing mode
  useEffect(() => {
    if (!isDrawingMode) {
      clearCanvas();
    }
  }, [isDrawingMode, clearCanvas]);

  // Effect to expose editor instance
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = drawingColor;
      ctxRef.current.lineWidth = isErasing ? eraserSize : BASE_LINE_WIDTH;
      ctxRef.current.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
    }
  }, [isDrawingMode, drawingColor, isErasing, eraserSize]);

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

  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ('touches' in event.nativeEvent) {
      const touch = event.nativeEvent.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = event.nativeEvent.clientX;
      clientY = event.nativeEvent.clientY;
    }

    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    const scaledOffsetX = offsetX / zoomLevel;
    const scaledOffsetY = offsetY / zoomLevel;

    return { x: scaledOffsetX, y: scaledOffsetY };
  };

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctxRef.current || !canvasRef.current) {
      return;
    }
    event.preventDefault();
    
    const { x, y } = getCoordinates(event);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setIsDrawing(true);
  }, [zoomLevel]);

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctxRef.current || !canvasRef.current) return;
    event.preventDefault();
    
    const { x, y } = getCoordinates(event);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  }, [isDrawing, zoomLevel]);

  const endDrawing = useCallback(() => {
    if (!ctxRef.current) return;
    ctxRef.current.closePath();
    setIsDrawing(false);
  }, []);

  const insertDrawing = useCallback(() => {
    if (editor && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      editor.chain().focus().setImage({ src: dataUrl }).run();
      clearCanvas();
      setIsDrawingMode(false);
    }
  }, [editor, clearCanvas]);

  const analyzeDrawing = useCallback(async () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];
      const mimeType = 'image/png';

      const toastId = showLoading("AI is analyzing your drawing...");

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Session not found. Please log in again.");
        }

        const response = await fetch(
          `https://juosdmecldzlvrinnzwf.supabase.co/functions/v1/analyze-drawing`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJis_publicsIjoiInN1cGFiYXNlIiwicmVmIjoianVvc2RtZWNwZHV6bHZyaW5uendmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNjA1MTAsImV4cCI6MjA2MjkzNjUxMH0.xvg8a1qa6WBuWY9VDLNtQxjnL5VmylefmfchofI1mJU",
            },
            body: JSON.stringify({ base64Image: base64Data, mimeType }),
          }
        );

        const result = await response.json();
        

        if (!response.ok || result.error) {
          throw new Error(result?.error || "Failed to analyze drawing.");
        }

        if (result.extracted_content && result.extracted_content.trim() !== "") {
          setTextToReplace(result.extracted_content);
          setShowReplaceDialog(true);
        } else {
          showError("AI could not extract meaningful content from the drawing.");
        }
        
      } catch (err: any) {
        showError(err.message || "An unexpected error occurred during drawing analysis.");
        console.error("AI drawing analysis error:", err);
      } finally {
        dismissToast(toastId);
      }
    }
  }, [editor]);

  const handleConfirmReplace = useCallback(() => {
    if (editor && textToReplace) {
      editor.chain().focus().insertContentAt(editor.state.doc.content.size, '<p>' + textToReplace + '</p>').run();
      showSuccess("AI transcription added to note content!");
    }
    setShowReplaceDialog(false);
    setTextToReplace('');
  }, [editor, textToReplace]);

  const handleCancelReplace = useCallback(() => {
    setShowReplaceDialog(false);
    setTextToReplace('');
    showSuccess("AI transcription not applied.");
  }, []);

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
      <div className="relative border rounded-md overflow-hidden" style={{ height: '300px' }}>
        <div className={cn(
          "absolute inset-0",
          isDrawingMode ? "pointer-events-none z-0 opacity-50" : "z-10 opacity-100",
          "transition-opacity duration-300"
        )}>
          <EditorContent editor={editor} />
        </div>

        <canvas
          ref={canvasRef}
          className={cn(
            "absolute top-0 left-0 bg-white dark:bg-gray-900",
            isDrawingMode ? "z-20 pointer-events-auto" : "z-0 pointer-events-none"
          )}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          style={{ 
            transform: `scale(${zoomLevel})`, 
            transformOrigin: 'top left',
            touchAction: 'none',
            width: '100%',
            height: '100%',
            cursor: customCursorStyle,
          }}
        />
      </div>

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