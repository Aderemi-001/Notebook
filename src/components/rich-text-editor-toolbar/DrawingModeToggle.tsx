import React from 'react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PencilLine } from 'lucide-react';

interface DrawingModeToggleProps {
  isDrawingMode: boolean;
  setIsDrawingMode: (mode: boolean) => void;
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
            className="px-2"
          >
            <PencilLine className="h-4 w-4" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          {isDrawingMode ? "Exit Drawing Mode" : "Enter Drawing Mode"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DrawingModeToggle;