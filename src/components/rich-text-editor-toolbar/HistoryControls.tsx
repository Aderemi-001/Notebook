import React from 'react';
import { Editor } from '@tiptap/react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Undo, Redo } from 'lucide-react';

interface HistoryControlsProps {
  editor: Editor;
}

const HistoryControls: React.FC<HistoryControlsProps> = ({ editor }) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              onPressedChange={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              aria-label="Undo"
            >
              <Undo className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              onPressedChange={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              aria-label="Redo"
            >
              <Redo className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default HistoryControls;