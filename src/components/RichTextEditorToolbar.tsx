import React, { useCallback } from 'react';
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
import { ColorPicker } from './ColorPicker';
import { Slider } from '@/components/ui/slider';

interface RichTextEditorToolbarProps {
  editor: Editor;
  isDrawingMode: boolean;
  setIsDrawingMode: React.Dispatch<React.SetStateAction<boolean>>; // Updated type
  drawingColor: string;
  setDrawingColor: (color: string) => void;
  penSize: number;
  setPenSize: (size: number) => void;
  isErasing: boolean;
  setIsErasing: React.Dispatch<React.SetStateAction<boolean>>; // Updated type
  eraserSize: number;
  setEraserSize: (size: number) => void;
  clearCanvas: () => void;
  insertDrawing: () => void;
  analyzeDrawing: () => Promise<void>;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>; // Updated type
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
}

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

  const applyHighlight = useCallback((color: string) => {
    editor.chain().focus().setCustomHighlight({ color }).run();
  }, [editor]);

  const toggleHighlight = useCallback(() => {
    if (editor.isActive('customHighlight')) {
      editor.chain().focus().unsetCustomHighlight().run();
    } else {
      // Default highlight color if none is active
      editor.chain().focus().setCustomHighlight({ color: '#FFFF00' }).run();
    }
  }, [editor]);

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

            {/* Highlight */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={editor.isActive('customHighlight')}
                    onPressedChange={toggleHighlight}
                    aria-label="Toggle highlight"
                  >
                    <Highlighter className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Highlight</TooltipContent>
              </Tooltip>
              <ColorPicker
                color={editor.getAttributes('customHighlight').color || '#FFFF00'}
                onChange={applyHighlight}
              />
            </div>

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
              <ColorPicker color={drawingColor} onChange={setDrawingColor} />
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