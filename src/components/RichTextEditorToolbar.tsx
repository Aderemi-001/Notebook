import React, { useCallback, useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Heading1,
  Quote,
  Minus,
  Redo,
  Undo,
  Highlighter,
  Eraser,
  Pencil,
  Image,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link,
  Unlink,
  ZoomIn,
  ZoomOut,
  Trash2,
  Pin, // Added Pin icon for pinned colors
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover, // Added Popover for highlight color picker
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator'; // Added Separator
import { HexColorPicker } from 'react-colorful'; // Added HexColorPicker
// Removed: import { showError } from '@/utils/toast'; // Added showError

interface RichTextEditorToolbarProps {
  editor: Editor;
  isDrawingMode: boolean;
  setIsDrawingMode: React.Dispatch<React.SetStateAction<boolean>>;
  drawingColor: string;
  setDrawingColor: (color: string) => void;
  penSize: number;
  setPenSize: (size: number) => void;
  isErasing: boolean;
  setIsErasing: React.Dispatch<React.SetStateAction<boolean>>;
  eraserSize: number;
  setEraserSize: (size: number) => void;
  clearCanvas: () => void;
  insertDrawing: () => void;
  analyzeDrawing: () => Promise<void>;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
}

// Highlight color constants and utility functions (moved from HighlightControls.tsx)
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

// ColorSwatch Component (moved from HighlightControls.tsx)
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


const RichTextEditorToolbar: React.FC<RichTextEditorToolbarProps> = ({
  editor,
  isDrawingMode,
  setIsDrawingMode,
  drawingColor,
  setDrawingColor,
  penSize,
  setPenSize,
  isErasing,
  setIsErasing,
  eraserSize,
  setEraserSize,
  clearCanvas,
  insertDrawing,
  analyzeDrawing,
  zoomLevel,
  setZoomLevel,
  minZoom,
  maxZoom,
  zoomStep,
}) => {
  const [activeHighlightColor, setActiveHighlightColor] = useState(HIGHLIGHT_COLORS[0].hex);
  const [isHighlightPopoverOpen, setIsHighlightPopoverOpen] = useState(false);
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
    if (!isHighlightPopoverOpen) {
      const currentHighlightAttrs = editor.getAttributes('highlight');
      if (currentHighlightAttrs && currentHighlightAttrs.color) {
        const colorFromAttrs = currentHighlightAttrs.color;

        // Check if it's one of the preset colors
        const presetMatch = HIGHLIGHT_COLORS.find(c => c.hex === colorFromAttrs);
        if (presetMatch) {
          setActiveHighlightColor(presetMatch.hex);
          setCustomPickerColor(presetMatch.hex);
          return;
        }

        // Check if it's a recently used or pinned color (which are stored as hex strings)
        const recentOrPinnedMatch = recentlyUsedColors.find(c => c === colorFromAttrs) ||
                                   pinnedColors.find(c => c === colorFromAttrs);
        if (recentOrPinnedMatch) {
          setActiveHighlightColor(recentOrPinnedMatch);
          setCustomPickerColor(recentOrPinnedMatch);
          return;
        }

        // If it's a custom color not in presets/recent/pinned, just use it
        setActiveHighlightColor(colorFromAttrs);
        setCustomPickerColor(colorFromAttrs);
      } else {
        // If no highlight is active, default to the first color or the last active custom color
        setActiveHighlightColor(customPickerColor || HIGHLIGHT_COLORS[0].hex);
      }
    }
  }, [editor, editor.state.selection, isHighlightPopoverOpen, recentlyUsedColors, pinnedColors, customPickerColor]);


  const addImage = useCallback(() => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleSelectHighlightColor = useCallback((colorHex: string) => {
    setActiveHighlightColor(colorHex);
    setCustomPickerColor(colorHex); // Keep picker in sync
    editor.chain().focus().setHighlight({ color: colorHex }).run();
    
    setRecentlyUsedColors(prevRecents => {
      const newRecents = addRecentColor(colorHex, prevRecents);
      saveColorsToLocalStorage(RECENT_COLORS_KEY, newRecents);
      return newRecents;
    });
    setIsHighlightPopoverOpen(false); // Close popover after selecting a color
  }, [editor]);

  const handleRemoveHighlight = useCallback(() => {
    editor.chain().focus().unsetHighlight().run();
    setIsHighlightPopoverOpen(false); // Close popover after removing highlight
  }, [editor]);

  const handleCustomPickerChange = useCallback((colorHex: string) => {
    setCustomPickerColor(colorHex);
  }, []);

  const handleApplyCustomColor = useCallback(() => {
    handleSelectHighlightColor(customPickerColor);
  }, [customPickerColor, handleSelectHighlightColor]);

  const handleTogglePin = useCallback((color: string) => {
    setPinnedColors(prevPinned => {
      const newPinned = togglePinnedColor(color, prevPinned);
      saveColorsToLocalStorage(PINNED_COLORS_KEY, newPinned);
      return newPinned;
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + zoomStep, maxZoom));
  }, [setZoomLevel, zoomStep, maxZoom]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - zoomStep, minZoom));
  }, [setZoomLevel, zoomStep, minZoom]);

  const handleToggleDrawingMode = useCallback(() => {
    setIsDrawingMode((prev) => !prev);
    setIsErasing(false); // Reset eraser when toggling drawing mode
  }, [setIsDrawingMode, setIsErasing]);

  const handleToggleEraser = useCallback(() => {
    setIsErasing((prev) => !prev);
  }, [setIsErasing]);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        {/* Text Formatting Controls */}
        {!isDrawingMode && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive('bold')}
                  onPressedChange={() => editor.chain().focus().toggleBold().run()}
                  aria-label="Toggle bold"
                >
                  <Bold className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Bold</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive('italic')}
                  onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                  aria-label="Toggle italic"
                >
                  <Italic className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Italic</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive('underline')}
                  onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
                  aria-label="Toggle underline"
                >
                  <Underline className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Underline</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive('strike')}
                  onPressedChange={() => editor.chain().focus().toggleStrike().run()}
                  aria-label="Toggle strikethrough"
                >
                  <Strikethrough className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Strikethrough</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive('code')}
                  onPressedChange={() => editor.chain().focus().toggleCode().run()}
                  aria-label="Toggle code"
                >
                  <Code className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Code</TooltipContent>
            </Tooltip>

            {/* Highlight Controls (re-integrated) */}
            <Popover open={isHighlightPopoverOpen} onOpenChange={setIsHighlightPopoverOpen}>
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
              <PopoverContent className="w-full sm:w-64 p-2">
                {pinnedColors.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Pinned Colors</p>
                    <div className="flex flex-wrap gap-1">
                      {pinnedColors.map((color) => (
                        <ColorSwatch
                          key={color}
                          color={color}
                          isSelected={activeHighlightColor === color}
                          onSelect={handleSelectHighlightColor}
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
                        onSelect={handleSelectHighlightColor}
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
                          onSelect={handleSelectHighlightColor}
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
                </div>
              </PopoverContent>
            </Popover>

            {/* Block Controls */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Heading1 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Headings & Blocks</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().setParagraph().run()}
                  className={editor.isActive('paragraph') ? 'is-active' : ''}
                >
                  Paragraph
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
                >
                  Heading 1
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
                >
                  Heading 2
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
                >
                  Heading 3
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                  className={editor.isActive('heading', { level: 4 }) ? 'is-active' : ''}
                >
                  Heading 4
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
                  className={editor.isActive('heading', { level: 5 }) ? 'is-active' : ''}
                >
                  Heading 5
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
                  className={editor.isActive('heading', { level: 6 }) ? 'is-active' : ''}
                >
                  Heading 6
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={editor.isActive('bulletList') ? 'is-active' : ''}
                >
                  <List className="h-4 w-4 mr-2" /> Bullet List
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={editor.isActive('orderedList') ? 'is-active' : ''}
                >
                  <ListOrdered className="h-4 w-4 mr-2" /> Ordered List
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={editor.isActive('blockquote') ? 'is-active' : ''}
                >
                  <Quote className="h-4 w-4 mr-2" /> Blockquote
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                >
                  <Minus className="h-4 w-4 mr-2" /> Horizontal Rule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Alignment Controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive({ textAlign: 'left' })}
                  onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
                  aria-label="Align left"
                >
                  <AlignLeft className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Align Left</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive({ textAlign: 'center' })}
                  onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
                  aria-label="Align center"
                >
                  <AlignCenter className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Align Center</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive({ textAlign: 'right' })}
                  onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
                  aria-label="Align right"
                >
                  <AlignRight className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Align Right</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive({ textAlign: 'justify' })}
                  onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}
                  aria-label="Align justify"
                >
                  <AlignJustify className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Align Justify</TooltipContent>
            </Tooltip>

            {/* Link Controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive('link')}
                  onPressedChange={setLink}
                  aria-label="Set link"
                >
                  <Link className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Set Link</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().unsetLink().run()}
                  disabled={!editor.isActive('link')}
                  aria-label="Unset link"
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Unset Link</TooltipContent>
            </Tooltip>

            {/* Image */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={addImage} aria-label="Add image">
                  <Image className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Image</TooltipContent>
            </Tooltip>

            {/* Undo/Redo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                  aria-label="Undo"
                >
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                  aria-label="Redo"
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
          </>
        )}

        {/* Drawing Mode Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={isDrawingMode}
              onPressedChange={handleToggleDrawingMode}
              aria-label="Toggle drawing mode"
            >
              <Pencil className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Toggle Drawing Mode</TooltipContent>
        </Tooltip>

        {/* Drawing Controls */}
        {isDrawingMode && (
          <>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={!isErasing}
                    onPressedChange={() => setIsErasing(false)}
                    aria-label="Select pen"
                  >
                    <Pencil className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Pen</TooltipContent>
              </Tooltip>
              {/* ColorPicker for drawing */}
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        style={{ backgroundColor: drawingColor }}
                        aria-label="Select drawing color"
                      />
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Drawing Color</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-auto p-2 flex flex-wrap gap-1">
                  <span className="text-sm text-muted-foreground mr-1 h-8 flex items-center">Color:</span>
                  {HIGHLIGHT_COLORS.map((colorOption) => ( // Reusing HIGHLIGHT_COLORS for drawing
                    <Tooltip key={colorOption.hex}>
                      <TooltipTrigger asChild>
                        <Toggle
                          size="sm"
                          pressed={drawingColor === colorOption.hex}
                          onPressedChange={() => setDrawingColor(colorOption.hex)}
                          aria-label={`Set drawing color to ${colorOption.name}`}
                          className="relative"
                        >
                          <div
                            className="w-4 h-4 rounded-full border border-foreground/20"
                            style={{ backgroundColor: colorOption.hex }}
                          ></div>
                        </Toggle>
                      </TooltipTrigger>
                      <TooltipContent>
                        {colorOption.name}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </PopoverContent>
              </Popover>
              <div className="w-20">
                <Slider
                  min={1}
                  max={20}
                  step={1}
                  value={[penSize]}
                  onValueChange={([value]) => setPenSize(value)}
                  aria-label="Pen size"
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={isErasing}
                    onPressedChange={handleToggleEraser}
                    aria-label="Select eraser"
                  >
                    <Eraser className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Eraser</TooltipContent>
              </Tooltip>
              <div className="w-20">
                <Slider
                  min={5}
                  max={50}
                  step={1}
                  value={[eraserSize]}
                  onValueChange={([value]) => setEraserSize(value)}
                  aria-label="Eraser size"
                />
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={clearCanvas} aria-label="Clear canvas">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear Canvas</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} aria-label="Zoom in">
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleZoomOut} aria-label="Zoom out">
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            <span className="text-sm text-muted-foreground">{Math.round(zoomLevel * 100)}%</span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={insertDrawing} aria-label="Insert drawing">
                  <Image className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Insert Drawing</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={analyzeDrawing} aria-label="Analyze drawing with AI">
                  Analyze with AI
                </Button>
              </TooltipTrigger>
              <TooltipContent>Analyze Drawing with AI</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default RichTextEditorToolbar;