import React, { useState, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Highlighter, Eraser, Pin } from 'lucide-react'; // Added Eraser and Pin
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { HexColorPicker } from 'react-colorful'; // Import HexColorPicker

interface HighlightControlsProps {
  editor: Editor;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', hex: '#facc15', dataColor: 'yellow' },
  { name: 'Green', hex: '#4ade80', dataColor: 'green' },
  { name: 'Blue', hex: '#60a5fa', dataColor: 'blue' },
  { name: 'Red', hex: '#ef4444', dataColor: 'red' },
  { name: 'Purple', hex: '#a855f7', dataColor: 'purple' },
  { name: 'Orange', hex: '#fb923c', dataColor: 'orange' },
  { name: 'Cyan', hex: '#22d3ee', dataColor: 'cyan' },
  { name: 'Pink', hex: '#f472b6', dataColor: 'pink' },
];

const RECENT_COLORS_KEY = 'highlight_recent_colors';
const PINNED_COLORS_KEY = 'highlight_pinned_colors';
const MAX_RECENT_COLORS = 8;

// Helper functions for localStorage
const getColorsFromLocalStorage = (key: string): string[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error(`Error reading from localStorage for key ${key}:`, error);
    return [];
  }
};

const saveColorsToLocalStorage = (key: string, colors: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(colors));
  } catch (error) {
    console.error(`Error writing to localStorage for key ${key}:`, error);
  }
};

const addRecentColor = (color: string, currentRecents: string[]): string[] => {
  const newRecents = [color, ...currentRecents.filter(c => c !== color)];
  return newRecents.slice(0, MAX_RECENT_COLORS);
};

const togglePinnedColor = (color: string, currentPinned: string[]): string[] => {
  if (currentPinned.includes(color)) {
    return currentPinned.filter(c => c !== color);
  } else {
    return [...currentPinned, color];
  }
};

// ColorSwatch Component
interface ColorSwatchProps {
  color: string;
  isSelected: boolean;
  onSelect: (color: string) => void;
  onTogglePin?: (color: string) => void;
  isPinned?: boolean;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, isSelected, onSelect, onTogglePin, isPinned }) => {
  const handlePinClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent button's onClick
    if (onTogglePin) {
      onTogglePin(color);
    }
  }, [color, onTogglePin]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onSelect(color)}
            className={`relative w-8 h-8 rounded-full border-2 ${isSelected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent'} focus:outline-none transition-all duration-150 ease-in-out`}
            style={{ backgroundColor: color }}
            aria-label={`Select ${color}`}
          >
            {isSelected && (
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold" style={{ textShadow: '0 0 2px rgba(0,0,0,0.5)' }}>✓</span>
            )}
            {onTogglePin && (
              <button
                onClick={handlePinClick}
                className="absolute -top-1 -right-1 bg-background rounded-full p-0.5 border border-border shadow-sm hover:bg-accent transition-colors"
                aria-label={isPinned ? "Unpin color" : "Pin color"}
              >
                <Pin className={`h-3 w-3 ${isPinned ? 'text-primary' : 'text-muted-foreground'}`} fill={isPinned ? 'currentColor' : 'none'} />
              </button>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {color}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const HighlightControls: React.FC<HighlightControlsProps> = ({ editor }) => {
  const [activeHighlightColor, setActiveHighlightColor] = useState(HIGHLIGHT_COLORS[0].hex);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [customPickerColor, setCustomPickerColor] = useState(HIGHLIGHT_COLORS[0].hex);
  const [recentlyUsedColors, setRecentlyUsedColors] = useState<string[]>([]);
  const [pinnedColors, setPinnedColors] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setRecentlyUsedColors(getColorsFromLocalStorage(RECENT_COLORS_KEY));
    setPinnedColors(getColorsFromLocalStorage(PINNED_COLORS_KEY));
  }, []);

  // Effect to update activeHighlightColor based on the current selection's highlight
  useEffect(() => {
    if (!isPopoverOpen) {
      const currentHighlightAttrs = editor.getAttributes('highlight');
      if (currentHighlightAttrs && currentHighlightAttrs.color) {
        const matchedColor = HIGHLIGHT_COLORS.find(c => c.hex === currentHighlightAttrs.color) ||
                             recentlyUsedColors.find(c => c === currentHighlightAttrs.color) ||
                             pinnedColors.find(c => c === currentHighlightAttrs.color);
        if (matchedColor) {
          setActiveHighlightColor(matchedColor.hex || matchedColor);
        } else {
          // If it's a custom color not in presets/recent/pinned, just use it
          setActiveHighlightColor(currentHighlightAttrs.color);
        }
      } else {
        // If no highlight is active, default to the first color or the last active custom color
        setActiveHighlightColor(customPickerColor || HIGHLIGHT_COLORS[0].hex);
      }
    }
  }, [editor, editor.state.selection, isPopoverOpen, recentlyUsedColors, pinnedColors, customPickerColor]);

  const handleSelectColor = useCallback((colorHex: string) => {
    setActiveHighlightColor(colorHex);
    setCustomPickerColor(colorHex); // Keep picker in sync
    editor.chain().focus().setHighlight({ color: colorHex }).run();
    
    setRecentlyUsedColors(prevRecents => {
      const newRecents = addRecentColor(colorHex, prevRecents);
      saveColorsToLocalStorage(RECENT_COLORS_KEY, newRecents);
      return newRecents;
    });
    setIsPopoverOpen(false); // Close popover after selecting a color
  }, [editor]);

  const handleRemoveHighlight = useCallback(() => {
    editor.chain().focus().unsetHighlight().run();
    setIsPopoverOpen(false); // Close popover after removing highlight
  }, [editor]);

  const handleCustomPickerChange = useCallback((colorHex: string) => {
    setCustomPickerColor(colorHex);
    // Optionally apply live preview, but for now, only update the picker's state
    // editor.chain().focus().setHighlight({ color: colorHex }).run();
  }, []);

  const handleApplyCustomColor = useCallback(() => {
    handleSelectColor(customPickerColor);
  }, [customPickerColor, handleSelectColor]);

  const handleTogglePin = useCallback((color: string) => {
    setPinnedColors(prevPinned => {
      const newPinned = togglePinnedColor(color, prevPinned);
      saveColorsToLocalStorage(PINNED_COLORS_KEY, newPinned);
      return newPinned;
    });
  }, []);

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Toggle
                size="sm"
                pressed={editor.isActive('highlight')}
                aria-label="Highlight options"
                className="px-2 relative"
              >
                <Highlighter className="h-4 w-4" />
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
      <PopoverContent className="w-64 p-2">
        {pinnedColors.length > 0 && (
          <div className="mb-2">
            <p className="text-sm font-medium text-muted-foreground mb-1">Pinned Colors</p>
            <div className="flex flex-wrap gap-1">
              {pinnedColors.map((color) => (
                <ColorSwatch
                  key={color}
                  color={color}
                  isSelected={activeHighlightColor === color}
                  onSelect={handleSelectColor}
                  onTogglePin={handleTogglePin}
                  isPinned={true}
                />
              ))}
            </div>
            <Separator className="my-2" />
          </div>
        )}

        <div className="mb-2">
          <p className="text-sm font-medium text-muted-foreground mb-1">Preset Colors</p>
          <div className="grid grid-cols-4 gap-1">
            {HIGHLIGHT_COLORS.map((colorOption) => (
              <ColorSwatch
                key={colorOption.hex}
                color={colorOption.hex}
                isSelected={activeHighlightColor === colorOption.hex}
                onSelect={handleSelectColor}
                onTogglePin={handleTogglePin}
                isPinned={pinnedColors.includes(colorOption.hex)}
              />
            ))}
          </div>
        </div>
        <Separator className="my-2" />

        {recentlyUsedColors.length > 0 && (
          <div className="mb-2">
            <p className="text-sm font-medium text-muted-foreground mb-1">Recently Used</p>
            <div className="flex flex-wrap gap-1">
              {recentlyUsedColors.map((color) => (
                <ColorSwatch
                  key={color}
                  color={color}
                  isSelected={activeHighlightColor === color}
                  onSelect={handleSelectColor}
                  onTogglePin={handleTogglePin}
                  isPinned={pinnedColors.includes(color)}
                />
              ))}
            </div>
            <Separator className="my-2" />
          </div>
        )}

        <div className="mb-2">
          <p className="text-sm font-medium text-muted-foreground mb-1">Custom Color</p>
          <HexColorPicker color={customPickerColor} onChange={handleCustomPickerChange} className="w-full" />
          <Button
            size="sm"
            onClick={handleApplyCustomColor}
            className="w-full mt-2"
            style={{ backgroundColor: customPickerColor, color: 'white' }}
          >
            Apply Custom Color
          </Button>
        </div>
        <Separator className="my-2" />

        <div className="flex justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleRemoveHighlight}
                  disabled={!editor.can().chain().focus().unsetHighlight().run()}
                  aria-label="Remove Highlight"
                  variant="ghost"
                  className="flex items-center gap-1 text-red-500 hover:text-red-600"
                >
                  <Eraser className="h-4 w-4" /> Remove Highlight
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