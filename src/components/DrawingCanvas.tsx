"use client";

import * as React from "react"; // Explicitly import React
import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Pencil, Type, Save, Sparkles } from "lucide-react"; // Removed unused X
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "sonner";
import { Editor } from "@tiptap/react"; // Import Editor type

interface DrawingCanvasProps {
  initialDrawing?: string;
  onDrawingChange: (drawing: string) => void;
  isDrawingMode: boolean;
  setIsDrawingMode: (isDrawing: boolean) => void;
  onEditorReady: (
    instance: Editor, // Correctly type the editor instance
    analyzeFn: (image: string) => Promise<string>,
    insertFn: (text: string) => void
  ) => void;
}

export function DrawingCanvas({
  initialDrawing,
  onDrawingChange,
  isDrawingMode,
  setIsDrawingMode,
  onEditorReady,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [drawingData, setDrawingData] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      if (context) {
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 5;
        context.strokeStyle = "black";
        contextRef.current = context;

        if (initialDrawing) {
          const img = new Image();
          img.onload = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0);
            setDrawingData(initialDrawing);
          };
          img.src = initialDrawing;
        }
      }
    }
  }, [initialDrawing]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (!isDrawingMode) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current?.lineTo(offsetX, offsetY);
    contextRef.current?.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingMode) return;
    contextRef.current?.closePath();
    setIsDrawing(false);
    saveDrawing();
  };

  const startErasing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current?.clearRect(offsetX, offsetY, 20, 20); // Eraser size
    setIsErasing(true);
  };

  const erase = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isErasing) return;
    if (!isDrawingMode) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current?.clearRect(offsetX, offsetY, 20, 20); // Eraser size
  };

  const stopErasing = () => {
    if (!isDrawingMode) return;
    setIsErasing(false);
    saveDrawing();
  };

  const saveDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const data = canvas.toDataURL();
      setDrawingData(data);
      onDrawingChange(data);
    }
  }, [onDrawingChange]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      setDrawingData(null);
      onDrawingChange("");
    }
  };

  const analyzeDrawing = useCallback(async (image: string) => {
    toast.info("Analyzing drawing with AI...");
    // Placeholder for AI analysis
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve("AI analysis of drawing: This appears to be a diagram of a circuit board with several components.");
      }, 2000);
    });
  }, []);

  const insertTextIntoEditor = useCallback((text: string) => {
    if (editorRef.current) {
      editorRef.current.chain().focus().insertContent(text).run();
      toast.success("AI analysis inserted into note!");
    }
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      onEditorReady(editorRef.current, analyzeDrawing, insertTextIntoEditor);
    }
  }, [onEditorReady, analyzeDrawing, insertTextIntoEditor]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant={isDrawingMode ? "secondary" : "outline"}
          onClick={() => setIsDrawingMode(!isDrawingMode)}
        >
          {isDrawingMode ? <Type className="h-4 w-4 mr-2" /> : <Pencil className="h-4 w-4 mr-2" />}
          {isDrawingMode ? "Switch to Text Mode" : "Switch to Drawing Mode"}
        </Button>
        {isDrawingMode && (
          <>
            <Button variant="outline" onClick={clearCanvas}>
              <Eraser className="h-4 w-4 mr-2" /> Clear Drawing
            </Button>
            <Button variant="outline" onClick={saveDrawing}>
              <Save className="h-4 w-4 mr-2" /> Save Drawing
            </Button>
            {drawingData && (
              <Button variant="outline" onClick={async () => {
                const analysis = await analyzeDrawing(drawingData);
                insertTextIntoEditor(analysis);
              }}>
                <Sparkles className="h-4 w-4 mr-2" /> Analyze Drawing
              </Button>
            )}
          </>
        )}
      </div>

      {isDrawingMode ? (
        <div className="relative border rounded-md overflow-hidden">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="bg-white cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          ></canvas>
          {isErasing && (
            <div
              className="absolute bg-red-500 opacity-50 rounded-full"
              style={{
                width: 20,
                height: 20,
                pointerEvents: "none",
                transform: `translate(${isErasing ? -10 : 0}px, ${isErasing ? -10 : 0}px)`,
              }}
            ></div>
          )}
        </div>
      ) : (
        <RichTextEditor
          content={""} // Content will be managed by the parent component
          onContentChange={() => {}} // Content change will be managed by the parent component
          editable={true}
          editorRef={editorRef} // Pass the ref to RichTextEditor
        />
      )}
    </div>
  );
}