"use client";

import * as React from "react";
import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Pencil, Type, Save, Sparkles, ZoomIn, ZoomOut, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDrawingCanvas } from "@/hooks/use-drawing-canvas"; // Import the new hook
import { Slider } from "@/components/ui/slider"; // Import Slider for pen/eraser size
import { Label } from "@/components/ui/label"; // Import Label

interface DrawingCanvasProps {
  initialDrawing?: string;
  onDrawingChange: (drawingDataUrl: string | null) => void; // Callback for when drawing changes
  isDrawingMode: boolean;
  setIsDrawingMode: (isDrawing: boolean) => void;
  onAnalyzeDrawing: (base64Image: string, mimeType: string) => void; // Callback for AI analysis
  onInsertText: (text: string) => void; // Callback to insert text into editor
  isAnalyzing: boolean; // New prop to indicate if AI is analyzing
}

export function DrawingCanvas({
  initialDrawing,
  onDrawingChange,
  isDrawingMode,
  setIsDrawingMode,
  onAnalyzeDrawing,
  onInsertText,
  isAnalyzing,
}: DrawingCanvasProps) {
  const [drawingColor, setDrawingColor] = useState("black");
  const [penSize, setPenSize] = useState(5);
  const [isErasing, setIsErasing] = useState(false);
  const [eraserSize, setEraserSize] = useState(20);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const minZoom = 0.5;
  const maxZoom = 3;

  const {
    canvasRef,
    ctxRef,
    startDrawing,
    draw,
    endDrawing,
    clearCanvas,
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
    minZoom,
    maxZoom,
    onCanvasClickDetected: () => { /* No specific action on click in drawing mode for now */ },
  });

  // Load initial drawing if provided
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx && initialDrawing) {
      const img = new Image();
      img.onload = () => {
        // Clear canvas before drawing the image
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Draw the image, scaled to fit if necessary
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        // Save the loaded drawing to state
        onDrawingChange(canvas.toDataURL('image/png'));
      };
      img.src = initialDrawing;
    } else if (canvas && ctx && !initialDrawing) {
      // If no initial drawing, ensure canvas is clear and white
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      onDrawingChange(null);
    }
  }, [initialDrawing, canvasRef, ctxRef, onDrawingChange, clearCanvas]);


  const handleClearCanvas = useCallback(() => {
    clearCanvas();
    onDrawingChange(null); // Notify parent that drawing is cleared
    toast.info("Canvas cleared.");
  }, [clearCanvas, onDrawingChange]);

  const handleSaveDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onDrawingChange(dataUrl); // Notify parent with the new drawing data
      toast.success("Drawing saved!");
    }
  }, [onDrawingChange]);

  const handleAnalyzeDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];
      const mimeType = 'image/png';
      onAnalyzeDrawing(base64Data, mimeType);
    }
  }, [canvasRef, onAnalyzeDrawing]);

  const handleZoomIn = () => {
    setZoomLevel((prev: number) => Math.min(prev + 0.2, maxZoom));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev: number) => Math.max(prev - 0.2, minZoom));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={isDrawingMode ? "secondary" : "outline"}
          onClick={() => setIsDrawingMode(!isDrawingMode)}
        >
          {isDrawingMode ? <Type className="h-4 w-4 mr-2" /> : <Pencil className="h-4 w-4 mr-2" />}
          {isDrawingMode ? "Switch to Text Mode" : "Switch to Drawing Mode"}
        </Button>

        {isDrawingMode && (
          <>
            <Button
              variant={!isErasing ? "secondary" : "outline"}
              onClick={() => setIsErasing(false)}
              size="icon"
              aria-label="Pen Tool"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant={isErasing ? "secondary" : "outline"}
              onClick={() => setIsErasing(true)}
              size="icon"
              aria-label="Eraser Tool"
            >
              <Eraser className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Label className="text-sm">Size:</Label>
              <Slider
                min={1}
                max={isErasing ? 50 : 20}
                step={1}
                value={[isErasing ? eraserSize : penSize]}
                onValueChange={(val: number[]) => isErasing ? setEraserSize(val[0]) : setPenSize(val[0])}
                className="w-[100px]"
              />
            </div>

            <Button variant="outline" onClick={handleClearCanvas}>
              <Trash2 className="h-4 w-4 mr-2" /> Clear
            </Button>
            <Button variant="outline" onClick={handleSaveDrawing}>
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
            <Button variant="outline" onClick={handleAnalyzeDrawing} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                </>
              )}
              Analyze
            </Button>
            <Button variant="outline" onClick={handleZoomIn} size="icon" aria-label="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleZoomOut} size="icon" aria-label="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleResetView} size="icon" aria-label="Reset View">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {isDrawingMode && (
        <div className="relative border rounded-md overflow-hidden w-full h-[400px]"> {/* Responsive height */}
          <canvas
            ref={canvasRef}
            className="bg-white cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
          ></canvas>
        </div>
      )}
    </div>
  );
}