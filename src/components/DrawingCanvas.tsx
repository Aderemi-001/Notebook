"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Eraser, Pencil, Redo, Undo, Download, Trash2 } from 'lucide-react';

interface DrawingCanvasProps {
  initialImage?: string;
  onSave?: (dataUrl: string) => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ initialImage, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // New ref for the parent div
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyPointer, setHistoryPointer] = useState(-1);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [canvasWidth, setCanvasWidth] = useState(0); // State for canvas width
  const [canvasHeight, setCanvasHeight] = useState(0); // State for canvas height

  // Effect to set canvas dimensions and handle resizing
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) return;

    const setDimensions = () => {
      const rect = container.getBoundingClientRect();
      setCanvasWidth(rect.width);
      setCanvasHeight(rect.height);
    };

    setDimensions(); // Set initial dimensions

    const resizeObserver = new ResizeObserver(setDimensions);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []); // Run once on mount

  const saveState = useCallback(() => {
    if (canvasRef.current && context && canvasWidth > 0 && canvasHeight > 0) {
      const newHistory = history.slice(0, historyPointer + 1);
      newHistory.push(context.getImageData(0, 0, canvasWidth, canvasHeight)); // Use state dimensions
      setHistory(newHistory);
      setHistoryPointer(newHistory.length - 1);
    }
  }, [history, historyPointer, context, canvasWidth, canvasHeight]); // Add canvasWidth, canvasHeight to dependencies

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvasWidth > 0 && canvasHeight > 0) { // Ensure dimensions are set
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setContext(ctx);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize;
        ctx.strokeStyle = color;

        // Clear canvas before drawing anything
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        if (initialImage) {
          const img = new Image();
          img.src = initialImage;
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight); // Use state dimensions
            saveState(); // Save initial image to history
          };
        } else if (historyPointer >= 0 && history[historyPointer]) {
          // If there's history, restore the last state
          ctx.putImageData(history[historyPointer], 0, 0);
        } else {
          // If no initial image and no history, save a blank state
          saveState();
        }
      }
    }
  }, [initialImage, brushSize, color, saveState, canvasWidth, canvasHeight, history, historyPointer]); // Add canvasWidth, canvasHeight, history, historyPointer to dependencies

  useEffect(() => {
    if (context) {
      context.lineWidth = brushSize;
      context.strokeStyle = tool === 'pencil' ? color : '#FFFFFF'; // Eraser uses white color
      context.globalCompositeOperation = tool === 'pencil' ? 'source-over' : 'destination-out'; // Eraser effect
    }
  }, [brushSize, color, context, tool]);

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!context || !canvasRef.current) return;

    setIsDrawing(true);
    context.beginPath();

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const rect = canvasRef.current.getBoundingClientRect();
    context.moveTo(clientX - rect.left, clientY - rect.top);
  }, [context]);

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context || !canvasRef.current) return;

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const rect = canvasRef.current.getBoundingClientRect();
    context.lineTo(clientX - rect.left, clientY - rect.top);
    context.stroke();
  }, [isDrawing, context]);

  const endDrawing = useCallback(() => {
    if (!context) return;
    setIsDrawing(false);
    context.closePath();
    saveState();
  }, [context, saveState]);

  const undo = useCallback(() => {
    if (historyPointer > 0) {
      setHistoryPointer(prev => prev - 1);
      const prevImageData = history[historyPointer - 1];
      if (context && canvasRef.current && prevImageData && canvasWidth > 0 && canvasHeight > 0) {
        context.clearRect(0, 0, canvasWidth, canvasHeight); // Use state dimensions
        context.putImageData(prevImageData, 0, 0);
      }
    }
  }, [history, historyPointer, context, canvasWidth, canvasHeight]); // Add canvasWidth, canvasHeight to dependencies

  const redo = useCallback(() => {
    if (historyPointer < history.length - 1) {
      setHistoryPointer(prev => prev + 1);
      const nextImageData = history[historyPointer + 1];
      if (context && canvasRef.current && nextImageData && canvasWidth > 0 && canvasHeight > 0) {
        context.clearRect(0, 0, canvasWidth, canvasHeight); // Use state dimensions
        context.putImageData(nextImageData, 0, 0);
      }
    }
  }, [history, historyPointer, context, canvasWidth, canvasHeight]); // Add canvasWidth, canvasHeight to dependencies

  const clearCanvas = useCallback(() => {
    if (context && canvasRef.current && canvasWidth > 0 && canvasHeight > 0) {
      context.clearRect(0, 0, canvasWidth, canvasHeight); // Use state dimensions
      saveState();
    }
  }, [context, saveState, canvasWidth, canvasHeight]); // Add canvasWidth, canvasHeight to dependencies

  const downloadDrawing = useCallback(() => {
    if (canvasRef.current) {
      const image = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = 'drawing.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (canvasRef.current && onSave) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  }, [onSave]);

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <div className="flex space-x-2">
        <Button variant={tool === 'pencil' ? 'default' : 'outline'} onClick={() => setTool('pencil')}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant={tool === 'eraser' ? 'default' : 'outline'} onClick={() => setTool('eraser')}>
          <Eraser className="h-4 w-4" />
        </Button>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-10 p-1 border rounded-md cursor-pointer"
          title="Select brush color"
        />
        <Slider
          min={1}
          max={20}
          step={1}
          value={[brushSize]}
          onValueChange={(val) => setBrushSize(val[0])}
          className="w-[100px]"
        />
        <Button onClick={undo} disabled={historyPointer <= 0}>
          <Undo className="h-4 w-4" />
        </Button>
        <Button onClick={redo} disabled={historyPointer >= history.length - 1}>
          <Redo className="h-4 w-4" />
        </Button>
        <Button onClick={clearCanvas}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button onClick={downloadDrawing}>
          <Download className="h-4 w-4" />
        </Button>
        {onSave && (
          <Button onClick={handleSave}>Save Drawing</Button>
        )}
      </div>
      <div ref={containerRef} className="relative border rounded-md overflow-hidden w-full h-[400px]">
        <canvas
          ref={canvasRef}
          width={canvasWidth} // Set width attribute
          height={canvasHeight} // Set height attribute
          className="bg-white cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
      </div>
    </div>
  );
};

export default DrawingCanvas;