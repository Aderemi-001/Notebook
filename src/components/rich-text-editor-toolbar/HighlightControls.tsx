import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Highlighter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator'; // Import Separator

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
  const [activeHighlightColor, setActiveHighlightColor] = useState(HIGHLIGHT_COLORS[0].hex);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    // When the popover is closed, or if the selection changes, update the activeHighlightColor
    // to reflect the highlight under the cursor, if any.
    if (!isPopoverOpen) {
      const currentHighlightAttrs = editor.getAttributes('highlight');
      if (currentHighlightAttrs && currentHighlightAttrs.color) {
        const matchedColor = HIGHLIGHT_COLORS.find(c => c.hex === currentHighlightAttrs.color);
        if (matchedColor) {
          setActiveHighlightColor(matchedColor.hex);
        }
      } else {
        // If no highlight is active, default to the first color
        setActiveHighlightColor(HIGHLIGHT_COLORS[0].hex);
      }
    }
  }, [editor, editor.state.selection, isPopoverOpen]);

  const handleSelectColor = (colorHex: string) => {
    setActiveHighlightColor(colorHex);
    editor.chain().focus().setHighlight({ color: colorHex }).run();
    setIsPopoverOpen(false); // Close popover after selecting a color
  };

  const handleRemoveHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
    setIsPopoverOpen(false); // Close popover after removing highlight
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Toggle
                size="sm"
                pressed={editor.isActive('highlight')} // Indicate if ANY highlight is active
                aria-label="Highlight options"
                className="px-2 relative"
              >
                <Highlighter className="h-4 w-4" />
                {/* Visual indicator for the currently selected highlight color */}
                <div
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-foreground/20"
                  style={{ backgroundColor: activeHighlightColor }}
                ></div>
              </Toggle>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {editor.isActive('highlight') ? "Highlight Active (Click to change color)" : "Add Highlight (Click to choose color)"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-48 p-2"> {/* Adjusted width and padding */}
        <div className="mb-2">
          <p className="text-sm font-medium text-muted-foreground">Highlight Colors</p>
          <div className="grid grid-cols-3 gap-1 mt-1"> {/* Grid for colors */}
            {HIGHLIGHT_COLORS.map((colorOption) => (
              <TooltipProvider key={colorOption.dataColor}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={activeHighlightColor === colorOption.hex}
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
          </div>
        </div>
        <Separator className="my-2" /> {/* Separator */}
        <div className="flex justify-end"> {/* Align remove button to the right */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleRemoveHighlight}
                  disabled={!editor.can().chain().focus().unsetHighlight().run()}
                  aria-label="Remove Highlight"
                  variant="ghost"
                  className="flex items-center gap-1 text-red-500 hover:text-red-600" // Added red styling
                >
                  <X className="h-4 w-4" /> Remove
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Remove All Highlights
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default HighlightControls;