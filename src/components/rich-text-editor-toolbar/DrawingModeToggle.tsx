import React from 'react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil } from 'lucide-react';

interface DrawingModeToggleProps {
  isDrawingMode: boolean;
  setIsDrawingMode: (isDrawingMode: boolean) => void;
  drawingColor: string;
  // Removed: setDrawingColor: (color: string) => void; // This prop is not currently used in this component
  penSize: number; // Added penSize prop
  setPenSize: (size: number) => void; // Added setPenSize prop
}

const DrawingModeToggle: React.FC<DrawingModeToggleProps> = ({ isDrawingMode, setIsDrawingMode, drawingColor, penSize, setPenSize }) => {
  // For now, we're just passing the color and pen size down. If you want a color/size picker here,
  // we'd integrate it similar to how HighlightControls does it.
  // The setDrawingColor and setPenSize props are available if you want to add a selection UI later.

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={isDrawingMode}
            onPressedChange={setIsDrawingMode}
            aria-label="Toggle drawing mode"
            className="px-2 relative"
          >
            <Pencil className="h-4 w-4" />
            {isDrawingMode && (
              <div
                className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-foreground/20"
                style={{ backgroundColor: drawingColor }}
              ></div>
            )}
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          {isDrawingMode ? "Drawing Mode Active" : "Toggle Drawing Mode"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DrawingModeToggle;