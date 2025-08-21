import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image'; // Import Image extension
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
import { supabase } from '@/integrations/supabase/client'; // Added this import

interface RichTextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  editable?: boolean;
  className?: string;
  labelId?: string; // New prop for aria-labelledby
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;
const BASE_LINE_WIDTH = 3; // Base line width for drawing

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onContentChange, editable = true, className, labelId }) => {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#000000'); // Default to black
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // New zoom state

  // State for the replace confirmation dialog
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
        'aria-labelledby': labelId || '', // Use aria-labelledby for accessibility, provide empty string if undefined
      },
    },
  });

  const clearCanvas = useCallback(() => {
    if (canvasRef.current && ctxRef.current) {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Fill with white after clearing to ensure white background in toDataURL
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Effect for initializing canvas context and handling resizes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    // Initial setup
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
          // Only update if dimensions actually changed to avoid infinite loops
          if (canvas.width !== width || canvas.height !== height) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Save current drawing
            canvas.width = width;
            canvas.height = height;
            ctx.putImageData(imageData, 0, 0); // Restore drawing
          }
        }
      }
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.unobserve(canvas);
    };
  }, []); // Empty dependency array: runs once on mount

  // Effect for updating drawing styles and clearing canvas on mode change
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = drawingColor;
      ctxRef.current.lineWidth = BASE_LINE_WIDTH;
    }
    if (isDrawingMode) {
      clearCanvas(); // Clear canvas when entering drawing mode
    }
  }, [isDrawingMode, drawingColor, clearCanvas]);


  // Drawing functions
  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctxRef.current || !canvasRef.current) return;
    event.preventDefault(); // Prevent default touch/mouse behavior
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ('touches' in event.nativeEvent) { // It's a touch event
      const touch = event.nativeEvent.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else { // It's a mouse event
      clientX = event.nativeEvent.clientX;
      clientY = event.nativeEvent.clientY;
    }

    // Calculate offsetX and offsetY relative to the canvas
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    // Adjust coordinates for zoom level
    const scaledOffsetX = offsetX / zoomLevel;
    const scaledOffsetY = offsetY / zoomLevel;

    ctxRef.current.beginPath();
    ctxRef.current.moveTo(scaledOffsetX, scaledOffsetY);
    setIsDrawing(true);
  }, [zoomLevel]);

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctxRef.current || !canvasRef.current) return;
    event.preventDefault(); // Prevent default touch/mouse behavior
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ('touches' in event.nativeEvent) { // It's a touch event
      const touch = event.nativeEvent.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else { // It's a mouse event
      clientX = event.nativeEvent.clientX;
      clientY = event.nativeEvent.clientY;
    }

    // Calculate offsetX and offsetY relative to the canvas
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    // Adjust coordinates for zoom level
    const scaledOffsetX = offsetX / zoomLevel;
    const scaledOffsetY = offsetY / zoomLevel;

    ctxRef.current.lineTo(scaledOffsetX, scaledOffsetY);
    ctxRef.current.stroke();
  }, [isDrawing, zoomLevel]);

  const endDrawing = useCallback(() => {
    if (!ctxRef.current) return;
    ctxRef.current.closePath();
    setIsDrawing(false);
  }, []);

  const insertDrawing = useCallback(() => {
    if (editor && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png'); // Corrected: used canvasRef.current
      editor.chain().focus().setImage({ src: dataUrl }).run();
      clearCanvas(); // Clear canvas after inserting
      setIsDrawingMode(false); // Exit drawing mode
    }
  }, [editor, clearCanvas]);

  const analyzeDrawing = useCallback(async () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1]; // Get only the base64 part
      const mimeType = 'image/png'; // Assuming PNG from canvas

      // Show loading toast
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
        dismissToast(toastId); // Dismiss the loading toast
      }
    }
  }, [editor]);

  const handleConfirmReplace = useCallback(() => {
    if (editor && textToReplace) {
      // Insert the new text as a new paragraph at the end of the document
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
      <div className="relative border rounded-md overflow-auto" style={{ height: '300px' }}> {/* Added overflow-auto and fixed height */}
        {isDrawingMode && editable ? (
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 bg-white dark:bg-gray-900 z-10 cursor-crosshair"
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
              width: '100%', // Ensure canvas fills its container at 1x zoom
              height: '100%', // Ensure canvas fills its container at 1x zoom
            }}
          />
        ) : null}
        <EditorContent editor={editor} />
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