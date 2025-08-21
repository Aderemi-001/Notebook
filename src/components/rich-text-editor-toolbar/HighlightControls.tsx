import React from 'react';
import { Editor } from '@tiptap/react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Highlighter, X } from 'lucide-react';

interface HighlightControlsProps {
  editor: Editor;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', hex: '#facc15', dataColor: 'yellow' },
  { name: 'Green', hex: '#4ade80', dataColor: 'green' },
  { name: 'Blue', hex: '#60a5fa', dataColor: 'blue' },
  { name: 'Red', hex: '#ef4444', dataColor: 'red' },
  { name: 'Purple', hex: '#a855f7', dataColor: 'purple' },
];

const HighlightControls: React.FC<HighlightControlsProps> = ({ editor }) => {
  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Toggle
                size="sm"
                pressed={editor.isActive('highlight')}
                aria-label="Toggle highlight colors"
                className="px-2"
              >
                <Highlighter className="h-4 w-4" />
              </Toggle>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            Highlight Text
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-auto p-2 flex flex-wrap gap-1">
        <span className="text-sm text-muted-foreground mr-1 h-8 flex items-center">Highlight:</span>
        {HIGHLIGHT_COLORS.map((colorOption) => (
          <TooltipProvider key={colorOption.dataColor}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive('highlight', { color: colorOption.hex })}
                  onPressedChange={() => editor.chain().focus().toggleHighlight({ color: colorOption.hex }).run()}
                  disabled={!editor.can().chain().focus().toggleHighlight({ color: colorOption.hex }).run()}
                  aria-label={`Highlight ${colorOption.name}`}
                  className="relative"
                >
                  <Highlighter className="h-4 w-4" />
                  <div
                    className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-foreground/20"
                    style={{ backgroundColor: colorOption.hex }}
                  ></div>
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                {colorOption.name} Highlight
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {/* Option to remove highlight */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                onPressedChange={() => editor.chain().focus().unsetHighlight().run()}
                disabled={!editor.can().chain().focus().unsetHighlight().run()}
                aria-label="Remove Highlight"
              >
                <Highlighter className="h-4 w-4" />
                <X className="absolute top-0 right-0 h-3 w-3 text-red-500" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              Remove Highlight
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
};

export default HighlightControls;