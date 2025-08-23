import React from 'react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil } from 'lucide-react';

interface DrawingModeToggleProps {
  isDrawingMode: boolean;
  setIsDrawingMode: (isDrawingMode: boolean) => void;
  drawingColor: string;
}

const DrawingModeToggle: React.FC<DrawingModeToggleProps> = ({ isDrawingMode, setIsDrawingMode, drawingColor }) => {
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