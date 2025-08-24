"use client";

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Eraser, Pencil, Redo, Undo, Download, Trash2 } from 'lucide-react';
import { HexColorPicker } from 'react-colorful'; // Import HexColorPicker
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Import Popover components

export interface DrawingCanvasRef {
  clearCanvas: () => void;
  getImageDataURL: () => string | undefined;
}

interface DrawingCanvasProps {
  initialImage?: string;
  onSave?: (dataUrl: string) => void;
  editable?: boolean; // New prop
}

const DrawingCanvas = React.forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  ({ initialImage, onSave, editable = true }, ref) => { // Default editable to true
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyPointer, setHistoryPointer] = useState(-1);
    const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
    const [canvasWidth, setCanvasWidth] = useState(0);
    const [canvasHeight, setCanvasHeight] = useState(0);

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
    }, []);

    const saveState = useCallback(() => {
      if (canvasRef.current && context && canvasWidth > 0 && canvasHeight > 0) {
        const newHistory = history.slice(0, historyPointer + 1);
        newHistory.push(context.getImageData(0, 0, canvasWidth, canvasHeight));
        setHistory(newHistory);
        setHistoryPointer(newHistory.length - 1);
      }
    }, [history, historyPointer, context, canvasWidth, canvasHeight]);

    const clearCanvas = useCallback(() => {
      if (context && canvasRef.current && canvasWidth > 0 && canvasHeight > 0) {
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        // Reset history to just the cleared state
        setHistory([]);
        setHistoryPointer(-1);
        saveState(); // Save the new blank state
      }
    }, [context, saveState, canvasWidth, canvasHeight]);

    const getImageDataURL = useCallback(() => {
      if (canvasRef.current) {
        return canvasRef.current.toDataURL('image/png');
      }
      return undefined;
    }, []);

    useImperativeHandle(ref, () => ({
      clearCanvas: clearCanvas,
      getImageDataURL: getImageDataURL,
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas && canvasWidth > 0 && canvasHeight > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          setContext(ctx);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = brushSize;
          ctx.strokeStyle = color;

          ctx.clearRect(0, 0, canvasWidth, canvasHeight);

          if (initialImage) {
            const img = new Image();
            img.src = initialImage;
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
              saveState();
            };
          } else if (historyPointer >= 0 && history[historyPointer]) {
            ctx.putImageData(history[historyPointer], 0, 0);
          } else {
            saveState();
          }
        }
      }
    }, [initialImage, brushSize, color, saveState, canvasWidth, canvasHeight, history, historyPointer]);

    useEffect(() => {
      if (context) {
        context.lineWidth = brushSize;
        context.strokeStyle = tool === 'pencil' ? color : '#FFFFFF';
        context.globalCompositeOperation = tool === 'pencil' ? 'source-over' : 'destination-out';
      }
    }, [brushSize, color, context, tool]);

    const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!editable || !context || !canvasRef.current) return;

      setIsDrawing(true);
      context.beginPath();

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      const rect = canvasRef.current.getBoundingClientRect();
      context.moveTo(clientX - rect.left, clientY - rect.top);
    }, [context, editable]);

    const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!editable || !isDrawing || !context || !canvasRef.current) return;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      const rect = canvasRef.current.getBoundingClientRect();
      context.lineTo(clientX - rect.left, clientY - rect.top);
      context.stroke();
    }, [isDrawing, context, editable]);

    const endDrawing = useCallback(() => {
      if (!editable || !context) return;
      setIsDrawing(false);
      context.closePath();
      saveState();
    }, [context, saveState, editable]);

    const undo = useCallback(() => {
      if (historyPointer > 0) {
        setHistoryPointer(prev => prev - 1);
        const prevImageData = history[historyPointer - 1];
        if (context && canvasRef.current && prevImageData && canvasWidth > 0 && canvasHeight > 0) {
          context.clearRect(0, 0, canvasWidth, canvasHeight);
          context.putImageData(prevImageData, 0, 0);
        }
      }
    }, [history, historyPointer, context, canvasWidth, canvasHeight]);

    const redo = useCallback(() => {
      if (historyPointer < history.length - 1) {
        setHistoryPointer(prev => prev + 1);
        const nextImageData = history[historyPointer + 1];
        if (context && canvasRef.current && nextImageData && canvasWidth > 0 && canvasHeight > 0) {
          context.clearRect(0, 0, canvasWidth, canvasHeight);
          context.putImageData(nextImageData, 0, 0);
        }
      }
    }, [history, historyPointer, context, canvasWidth, canvasHeight]);

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
          <Button variant={tool === 'pencil' ? 'default' : 'outline'} onClick={() => setTool('pencil')} disabled={!editable}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant={tool === 'eraser' ? 'default' : 'outline'} onClick={() => setTool('eraser')} disabled={!editable}>
            <Eraser className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-10 h-10 p-1 border rounded-md cursor-pointer" disabled={!editable}>
                <div className="w-full h-full rounded-sm" style={{ backgroundColor: color }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <HexColorPicker color={color} onChange={setColor} />
            </PopoverContent>
          </Popover>
          <Slider
            min={1}
            max={20}
            step={1}
            value={[brushSize]}
            onValueChange={(val) => setBrushSize(val[0])}
            className="w-[100px]"
            disabled={!editable}
          />
          <Button onClick={undo} disabled={historyPointer <= 0 || !editable}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button onClick={redo} disabled={historyPointer >= history.length - 1 || !editable}>
            <Redo className="h-4 w-4" />
          </Button>
          <Button onClick={clearCanvas} disabled={!editable}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={downloadDrawing} disabled={!editable}>
            <Download className="h-4 w-4" />
          </Button>
          {onSave && (
            <Button onClick={handleSave} disabled={!editable}>Save Drawing</Button>
          )}
        </div>
        <div ref={containerRef} className="relative border rounded-md overflow-hidden w-full h-[400px]">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
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
  }
);

DrawingCanvas.displayName = "DrawingCanvas";

export default DrawingCanvas;