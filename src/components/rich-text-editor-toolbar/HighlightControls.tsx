import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Highlighter, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  // Effect to update activeHighlightColor based on the current selection's highlight
  useEffect(() => {
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
  }, [editor, editor.state.selection]); // Update when editor or selection changes

  const handleToggleHighlight = () => {
    editor.chain().focus().toggleHighlight({ color: activeHighlightColor }).run();
  };

  const handleSelectColor = (colorHex: string) => {
    setActiveHighlightColor(colorHex);
    editor.chain().focus().setHighlight({ color: colorHex }).run(); // Apply immediately
    setIsPopoverOpen(false); // Close popover after selecting a color
  };

  const handleRemoveHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
    setIsPopoverOpen(false); // Close popover after removing highlight
  };

  // Determine if the *currently selected* active highlight color is applied to the selection
  const isCurrentColorActive = editor.isActive('highlight', { color: activeHighlightColor });

  return (
    <div className="flex items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={isCurrentColorActive}
              onPressedChange={handleToggleHighlight}
              aria-label="Toggle highlight"
              className="px-2 relative rounded-r-none border-r-0"
            >
              <Highlighter className="h-4 w-4" />
              {/* Visual indicator for the active highlight color */}
              <div
                className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-foreground/20"
                style={{ backgroundColor: activeHighlightColor }}
              ></div>
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>
            {isCurrentColorActive ? "Toggle Highlight Off" : "Toggle Highlight On"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-l-none border-l-0"
                  aria-label="Highlight options"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              Choose Highlight Color
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
    </div>
  );
};

export default HighlightControls;