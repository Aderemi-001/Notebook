import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Highlighter, X } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Import Button for "Remove Highlight"

interface HighlightControlsProps {
  editor: Editor;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', hex: '#facc15', dataColor: 'yellow' },
  { name: 'Green', hex: '#4ade80', dataColor: 'green' },
  { name: 'Blue', hex: '#60a5fa', dataColor: 'blue' },
  { name: 'Red', hex: '#ef4444', dataColor: 'red' },
  { name: 'Purple', hex: '#a855f7', dataColor: 'purple' }, // Added purple
];

const HighlightControls: React.FC<HighlightControlsProps> = ({ editor }) => {
  // State to keep track of the currently selected highlight color
  const [activeHighlightColor, setActiveHighlightColor] = useState(HIGHLIGHT_COLORS[0].hex);

  // Effect to update activeHighlightColor if the editor's current highlight changes
  useEffect(() => {
    const currentHighlight = editor.getAttributes('highlight').color;
    if (currentHighlight && HIGHLIGHT_COLORS.some(c => c.hex === currentHighlight)) {
      setActiveHighlightColor(currentHighlight);
    } else if (!currentHighlight && editor.isActive('highlight')) {
      // If highlight is active but color is not one of ours (e.g., default Tiptap highlight),
      // or if it's a multicolor highlight, we can't represent it with a single active color.
      // For simplicity, we'll just keep the last selected color.
    }
  }, [editor, editor.isActive('highlight')]);


  const handleToggleHighlight = (checked: boolean) => {
    if (checked) {
      editor.chain().focus().setHighlight({ color: activeHighlightColor }).run();
    } else {
      editor.chain().focus().unsetHighlight().run();
    }
  };

  const handleSelectColor = (colorHex: string) => {
    setActiveHighlightColor(colorHex);
    editor.chain().focus().setHighlight({ color: colorHex }).run(); // Apply immediately
  };

  const handleRemoveHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
  };

  // Determine if any highlight is active to set the main toggle's pressed state
  const isAnyHighlightActive = editor.isActive('highlight');
  // Determine the color of the active highlight for the indicator, if any
  const currentEditorHighlightColor = editor.getAttributes('highlight').color;
  const indicatorColor = isAnyHighlightActive && currentEditorHighlightColor ? currentEditorHighlightColor : activeHighlightColor;


  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Toggle
                size="sm"
                pressed={isAnyHighlightActive}
                onPressedChange={handleToggleHighlight} // Now correctly uses 'checked' state
                aria-label="Toggle highlight"
                className="px-2 relative"
              >
                <Highlighter className="h-4 w-4" />
                {/* Visual indicator for the active highlight color */}
                <div
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-foreground/20"
                  style={{ backgroundColor: indicatorColor }}
                ></div>
              </Toggle>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {isAnyHighlightActive ? "Toggle Highlight Off" : "Toggle Highlight On"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-auto p-2 flex flex-wrap gap-1">
        <span className="text-sm text-muted-foreground mr-1 h-8 flex items-center">Colors:</span>
        {HIGHLIGHT_COLORS.map((colorOption) => (
          <TooltipProvider key={colorOption.dataColor}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={activeHighlightColor === colorOption.hex} // Indicate selected color in popover
                  onPressedChange={() => handleSelectColor(colorOption.hex)}
                  disabled={!editor.can().chain().focus().setHighlight({ color: colorOption.hex }).run()}
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
        {/* Dedicated button to remove highlight */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={handleRemoveHighlight}
                disabled={!editor.can().chain().focus().unsetHighlight().run()}
                aria-label="Remove Highlight"
                variant="ghost"
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4 text-red-500" /> Remove
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Remove All Highlights
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
};

export default HighlightControls;