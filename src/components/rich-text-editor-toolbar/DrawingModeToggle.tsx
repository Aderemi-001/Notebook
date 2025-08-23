import React from 'react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil } from 'lucide-react';

interface DrawingModeToggleProps {
  isDrawingMode: boolean;
  setIsDrawingMode: (isDrawingMode: boolean) => void;
  // Removed drawingColor, setDrawingColor, penSize, setPenSize as they are not directly used here.
}

const DrawingModeToggle: React.FC<DrawingModeToggleProps> = ({ isDrawingMode, setIsDrawingMode }) => {
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
            {/* Removed the color indicator as drawingColor is no longer passed here */}
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