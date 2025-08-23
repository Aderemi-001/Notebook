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
  Pin,
  MoreHorizontal,
  ListTodo,
  PenTool,
  CodeXml,
  Brain,
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { HexColorPicker } from 'react-colorful';
import { showError, showSuccess } from '@/utils/toast'; // Re-added toast imports
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface ColorSwatchProps {
  color: string;
  isSelected: boolean;
  onSelect: (color: string) => void;
  onTogglePin?: (color: string) => void;
  isPinned?: boolean;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, isSelected, onSelect, onTogglePin, isPinned }) => {
  const handlePinClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
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

  useEffect(() => {
    setRecentlyUsedColors(getColorsFromLocalStorage(RECENT_COLORS_KEY));
    setPinnedColors(getColorsFromLocalStorage(PINNED_COLORS_KEY));
  }, []);

  useEffect(() => {
    if (!isHighlightPopoverOpen) {
      const currentHighlightAttrs = editor.getAttributes('highlight');
      if (currentHighlightAttrs && currentHighlightAttrs.color) {
        const colorFromAttrs = currentHighlightAttrs.color;

        const presetMatch = HIGHLIGHT_COLORS.find(c => c.hex === colorFromAttrs);
        if (presetMatch) {
          setActiveHighlightColor(presetMatch.hex);
          setCustomPickerColor(presetMatch.hex);
          return;
        }

        const recentOrPinnedMatch = recentlyUsedColors.find(c => c === colorFromAttrs) ||
                                   pinnedColors.find(c => c === colorFromAttrs);
        if (recentOrPinnedMatch) {
          setActiveHighlightColor(recentOrPinnedMatch);
          setCustomPickerColor(recentOrPinnedMatch);
          return;
        }

        setActiveHighlightColor(colorFromAttrs);
        setCustomPickerColor(colorFromAttrs);
      } else {
        setActiveHighlightColor(customPickerColor || HIGHLIGHT_COLORS[0].hex);
      }
    }
  }, [editor, editor.state.selection, isHighlightPopoverOpen, recentlyUsedColors, pinnedColors, customPickerColor]);

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL');
    if (!url) {
      showError("Image URL cannot be empty.");
      return;
    }

    // Basic URL validation for common image file extensions
    const imageRegex = /\.(jpeg|jpg|gif|png|webp|svg)$/i;
    if (!imageRegex.test(url)) {
      showError("Invalid image URL format. Please provide a direct link to an image file (e.g., .png, .jpg).");
      return;
    }

    try {
      editor.chain().focus().setImage({ src: url }).run();
      showSuccess("Image inserted successfully!");
    } catch (error) {
      console.error("Error inserting image:", error);
      showError("Failed to insert image. Please check the URL or try again.");
    }
  }, [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleSelectHighlightColor = useCallback((colorHex: string) => {
    setActiveHighlightColor(colorHex);
    setCustomPickerColor(colorHex);
    editor.chain().focus().setHighlight({ color: colorHex }).run();
    
    setRecentlyUsedColors(prevRecents => {
      const newRecents = addRecentColor(colorHex, prevRecents);
      saveColorsToLocalStorage(RECENT_COLORS_KEY, newRecents);
      return newRecents;
    });
    setIsHighlightPopoverOpen(false);
  }, [editor]);

  const handleRemoveHighlight = useCallback(() => {
    editor.chain().focus().unsetHighlight().run();
    setIsHighlightPopoverOpen(false);
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
    setIsErasing(false);
  }, [setIsDrawingMode, setIsErasing]);

  const handleToggleEraser = useCallback(() => {
    setIsErasing((prev) => !prev);
  }, [setIsErasing]);

  const getActiveHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    if (editor.isActive('heading', { level: 4 })) return 'h4';
    if (editor.isActive('heading', { level: 5 })) return 'h5';
    if (editor.isActive('heading', { level: 6 })) return 'h6';
    return 'paragraph';
  };

  const handleHeadingChange = (value: string) => {
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: parseInt(value.substring(1)) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2 p-2 bg-secondary rounded-xl shadow-md mb-4">
        {/* Main Toolbar */}
        <div className="flex flex-wrap items-center gap-1">
          {!isDrawingMode ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={editor.isActive('bold')}
                    onPressedChange={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    aria-label="Toggle bold"
                    className="rounded-lg"
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
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    aria-label="Toggle italic"
                    className="rounded-lg"
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
                    disabled={!editor.can().chain().focus().toggleUnderline().run()}
                    aria-label="Toggle underline"
                    className="rounded-lg"
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
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    aria-label="Toggle strikethrough"
                    className="rounded-lg"
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
                    disabled={!editor.can().chain().focus().toggleCode().run()}
                    aria-label="Toggle code"
                    className="rounded-lg"
                  >
                    <Code className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Code</TooltipContent>
              </Tooltip>

              {/* Highlight Controls */}
              <Popover open={isHighlightPopoverOpen} onOpenChange={setIsHighlightPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Toggle
                        size="sm"
                        pressed={editor.isActive('highlight')}
                        aria-label="Highlight options"
                        className="px-2 relative rounded-lg"
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

              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={editor.isActive('link')}
                    onPressedChange={setLink}
                    disabled={!editor.can().chain().focus().setLink({ href: '' }).run()}
                    aria-label="Set link"
                    className="rounded-lg"
                  >
                    <Link className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Set Link</TooltipContent>
              </Tooltip>

              {/* More Options Dropdown */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-lg px-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>More Formatting</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-auto p-1 flex flex-col gap-1">
                  {/* Headings */}
                  <DropdownMenuItem className="flex items-center gap-1 p-1">
                    <Select onValueChange={handleHeadingChange} value={getActiveHeading()}>
                      <SelectTrigger className="w-[130px] h-8 px-2 rounded-lg">
                        <Heading1 className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Text Style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paragraph">Paragraph</SelectItem>
                        <SelectItem value="h1">Heading 1</SelectItem>
                        <SelectItem value="h2">Heading 2</SelectItem>
                        <SelectItem value="h3">Heading 3</SelectItem>
                        <SelectItem value="h4">Heading 4</SelectItem>
                        <SelectItem value="h5">Heading 5</SelectItem>
                        <SelectItem value="h6">Heading 6</SelectItem>
                      </SelectContent>
                    </Select>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  {/* Lists */}
                  <div className="flex items-center gap-1 p-1">
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Toggle
                            size="sm"
                            pressed={editor.isActive('bulletList')}
                            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                            disabled={!editor.can().chain().focus().toggleBulletList().run()}
                            aria-label="Toggle bullet list"
                            className="rounded-lg"
                          >
                            <List className="h-4 w-4" />
                          </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Bullet List</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Toggle
                            size="sm"
                            pressed={editor.isActive('orderedList')}
                            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                            disabled={!editor.can().chain().focus().toggleOrderedList().run()}
                            aria-label="Toggle ordered list"
                            className="rounded-lg"
                          >
                            <ListOrdered className="h-4 w-4" />
                          </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Ordered List</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Toggle
                            size="sm"
                            pressed={editor.isActive('taskList')}
                            onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
                            disabled={!editor.can().chain().focus().toggleTaskList().run()}
                            aria-label="Toggle todo list"
                            className="rounded-lg"
                          >
                            <ListTodo className="h-4 w-4" />
                          </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Todo List</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator />

                  {/* Alignment */}
                  <div className="flex items-center gap-1 p-1">
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Toggle
                            size="sm"
                            pressed={editor.isActive({ textAlign: 'left' })}
                            onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
                            aria-label="Align left"
                            className="rounded-lg"
                          >
                            <AlignLeft className="h-4 w-4" />
                          </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Align Left</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Toggle
                            size="sm"
                            pressed={editor.isActive({ textAlign: 'center' })}
                            onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
                            aria-label="Align center"
                            className="rounded-lg"
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Toggle>
                      </TooltipTrigger>
                      <TooltipContent>Align Center</TooltipContent>
                    </Tooltip>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Toggle
                            size="sm"
                            pressed={editor.isActive({ textAlign: 'right' })}
                            onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
                            aria-label="Align right"
                            className="rounded-lg"
                          >
                            <AlignRight className="h-4 w-4" />
                          </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Align Right</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Toggle
                            size="sm"
                            pressed={editor.isActive({ textAlign: 'justify' })}
                            onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}
                            aria-label="Align justify"
                            className="rounded-lg"
                          >
                            <AlignJustify className="h-4 w-4" />
                          </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Align Justify</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator />

                  {/* Other Block Formats */}
                  <div className="flex items-center gap-1 p-1">
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Toggle
                            size="sm"
                            pressed={editor.isActive('blockquote')}
                            onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
                            disabled={!editor.can().chain().focus().toggleBlockquote().run()}
                            aria-label="Toggle blockquote"
                            className="rounded-lg"
                          >
                            <Quote className="h-4 w-4" />
                          </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Blockquote</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Toggle
                            size="sm"
                            onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
                            disabled={!editor.can().chain().focus().setHorizontalRule().run()}
                            aria-label="Insert horizontal rule"
                            className="rounded-lg"
                          >
                            <Minus className="h-4 w-4" />
                          </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Horizontal Rule</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Toggle
                            size="sm"
                            pressed={editor.isActive('codeBlock')}
                            onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
                            disabled={!editor.can().chain().focus().toggleCodeBlock().run()}
                            aria-label="Toggle code block"
                            className="rounded-lg"
                          >
                            <CodeXml className="h-4 w-4" />
                          </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>Code Block</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator />

                  {/* Image and Undo/Redo */}
                  <div className="flex items-center gap-1 p-1">
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={addImage} aria-label="Add image" className="rounded-lg">
                            <Image className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add Image</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().undo().run()}
                            disabled={!editor.can().undo()}
                            aria-label="Undo"
                            className="rounded-lg"
                          >
                            <Undo className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Undo</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().redo().run()}
                            disabled={!editor.can().redo()}
                            aria-label="Redo"
                            className="rounded-lg"
                          >
                            <Redo className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Redo</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().unsetLink().run()}
                            disabled={!editor.isActive('link')}
                            aria-label="Unset link"
                            className="rounded-lg"
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Unset Link</TooltipContent>
                      </Tooltip>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            // Drawing Mode Toggle (always visible)
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={isDrawingMode}
                  onPressedChange={handleToggleDrawingMode}
                  aria-label="Toggle drawing mode"
                  className="rounded-lg"
                >
                  <Pencil className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Toggle Drawing Mode</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Drawing Controls (conditionally rendered) */}
        {isDrawingMode && (
          <div className="flex flex-wrap items-center gap-1 mt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={!isErasing}
                  onPressedChange={() => setIsErasing(false)}
                  aria-label="Select pen"
                  className="rounded-lg"
                >
                  <PenTool className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Pen</TooltipContent>
            </Tooltip>

            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg"
                      style={{ backgroundColor: drawingColor }}
                      aria-label="Select drawing color"
                    />
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Drawing Color</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-auto p-2 flex flex-wrap gap-1">
                <span className="text-sm text-muted-foreground mr-1 h-8 flex items-center">Color:</span>
                {HIGHLIGHT_COLORS.map((colorOption) => (
                  <Tooltip key={colorOption.hex}>
                    <TooltipTrigger asChild>
                      <Toggle
                        size="sm"
                        pressed={drawingColor === colorOption.hex}
                        onPressedChange={() => setDrawingColor(colorOption.hex)}
                        aria-label={`Set drawing color to ${colorOption.name}`}
                        className="relative rounded-lg"
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={isErasing}
                  onPressedChange={handleToggleEraser}
                  aria-label="Select eraser"
                  className="rounded-lg"
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={clearCanvas} aria-label="Clear canvas" className="rounded-lg">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear Canvas</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} aria-label="Zoom in" className="rounded-lg">
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleZoomOut} aria-label="Zoom out" className="rounded-lg">
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            <span className="text-sm text-muted-foreground">{Math.round(zoomLevel * 100)}%</span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={insertDrawing} aria-label="Insert drawing" className="rounded-lg">
                  <Image className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Insert Drawing</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={analyzeDrawing} aria-label="Analyze drawing with AI" className="rounded-lg">
                  <Brain className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Analyze Drawing with AI</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default RichTextEditorToolbar;