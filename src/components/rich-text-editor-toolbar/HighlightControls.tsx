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
  { name: 'Purple', hex: '#a855f7', dataColor: 'purple' },
];

const HighlightControls: React.FC<HighlightControlsProps> = ({ editor }) => {
  // State to keep track of the currently selected highlight color for applying
  const [activeHighlightColor, setActiveHighlightColor] = useState(HIGHLIGHT_COLORS[0].hex);

  // Effect to update activeHighlightColor based on the current selection's highlight, if any
  // This helps the UI reflect the color of an existing highlight when the cursor moves.
  useEffect(() => {
    const currentHighlightAttrs = editor.getAttributes('highlight');
    if (currentHighlightAttrs && currentHighlightAttrs.color) {
      const matchedColor = HIGHLIGHT_COLORS.find(c => c.hex === currentHighlightAttrs.color);
      if (matchedColor) {
        setActiveHighlightColor(matchedColor.hex);
      }
    }
  }, [editor, editor.state.selection]); // Update when editor or selection changes

  const handleToggleHighlight = () => {
    editor.chain().focus().toggleHighlight({ color: activeHighlightColor }).run();
  };

  const handleSelectColor = (colorHex: string) => {
    setActiveHighlightColor(colorHex);
    editor.chain().focus().setHighlight({ color: colorHex }).run(); // Apply immediately
  };

  const handleRemoveHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
  };

  // Determine if the *currently selected* active highlight color is applied to the selection
  const isCurrentColorActive = editor.isActive('highlight', { color: activeHighlightColor });

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Toggle
                size="sm"
                pressed={isCurrentColorActive} // Reflect if the active color is currently applied
                onPressedChange={handleToggleHighlight} // Toggle with the active color
                aria-label="Toggle highlight"
                className="px-2 relative"
              >
                <Highlighter className="h-4 w-4" />
                {/* Visual indicator for the active highlight color */}
                <div
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-foreground/20"
                  style={{ backgroundColor: activeHighlightColor }} // Always show the selected color
                ></div>
              </Toggle>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {isCurrentColorActive ? "Toggle Highlight Off" : "Toggle Highlight On"}
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