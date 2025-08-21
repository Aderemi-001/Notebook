import React from 'react';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette, Eraser, CheckCircle2, Brain, ZoomIn, ZoomOut } from 'lucide-react';

interface DrawingControlsProps {
  drawingColor: string;
  setDrawingColor: (color: string) => void;
  clearCanvas: () => void;
  insertDrawing: () => void;
  analyzeDrawing: () => void;
  zoomLevel: number;
  setZoomLevel: (level: number | ((prev: number) => number)) => void;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
}

const DRAWING_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'White', hex: '#ffffff' }, // For eraser effect on light background
];

const DrawingControls: React.FC<DrawingControlsProps> = ({
  drawingColor,
  setDrawingColor,
  clearCanvas,
  insertDrawing,
  analyzeDrawing,
  zoomLevel,
  setZoomLevel,
  minZoom,
  maxZoom,
  zoomStep,
}) => {
  const handleZoomIn = () => {
    setZoomLevel((prev: number) => Math.min(prev + zoomStep, maxZoom));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev: number) => Math.max(prev - zoomStep, minZoom));
  };

  return (
    <>
      {/* Drawing Color Palette */}
      <Popover>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Toggle
                  size="sm"
                  aria-label="Select drawing color"
                  className="px-2 relative"
                >
                  <Palette className="h-4 w-4" />
                  <div
                    className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-foreground/20"
                    style={{ backgroundColor: drawingColor }}
                  ></div>
                </Toggle>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Select Drawing Color</TooltipContent>
          </Tooltip>
        </Popover>
        <PopoverContent className="w-auto p-2 flex flex-wrap gap-1">
          <span className="text-sm text-muted-foreground mr-1 h-8 flex items-center">Color:</span>
          {DRAWING_COLORS.map((colorOption) => (
            <TooltipProvider key={colorOption.hex}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={drawingColor === colorOption.hex}
                    onPressedChange={() => setDrawingColor(colorOption.hex)}
                    aria-label={`Set drawing color to ${colorOption.name}`}
                    className="relative"
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-foreground/20"
                      style={{ backgroundColor: colorOption.hex }}
                    ></div>
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>
                  {colorOption.name}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </PopoverContent>
      </Popover>

      {/* Clear Canvas */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              onPressedChange={clearCanvas}
              aria-label="Clear drawing"
              className="px-2"
            >
              <Eraser className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Clear Drawing</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Insert Drawing */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={insertDrawing}
              aria-label="Insert drawing into note"
              className="px-2"
              variant="ghost"
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert Drawing</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Analyze Drawing with AI */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={analyzeDrawing}
              aria-label="Analyze drawing with AI"
              className="px-2"
              variant="ghost"
            >
              <Brain className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Analyze Drawing with AI</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Zoom Controls for Drawing Mode */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              onPressedChange={handleZoomOut}
              aria-label="Zoom out"
              disabled={zoomLevel <= minZoom}
              className="px-2"
            >
              <ZoomOut className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="text-sm text-muted-foreground flex items-center px-2">
        {(zoomLevel * 100).toFixed(0)}%
      </span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              onPressedChange={handleZoomIn}
              aria-label="Zoom in"
              disabled={zoomLevel >= maxZoom}
              className="px-2"
            >
              <ZoomIn className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};

export default DrawingControls;