import React from 'react';
import { Editor } from '@tiptap/react';
import { Toggle } from '@/components/ui/toggle';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Minus, Highlighter, Undo, Redo, X, ListTodo, MoreHorizontal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RichTextEditorToolbarProps {
  editor: Editor | null;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', hex: '#facc15', dataColor: 'yellow' },
  { name: 'Green', hex: '#4ade80', dataColor: 'green' },
  { name: 'Blue', hex: '#60a5fa', dataColor: 'blue' },
  { name: 'Red', hex: '#ef4444', dataColor: 'red' },
  { name: 'Purple', hex: '#a855f7', dataColor: 'purple' },
];

const RichTextEditorToolbar: React.FC<RichTextEditorToolbarProps> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-nowrap w-full border-b overflow-x-auto scrollbar-hide px-2 py-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('bold')}
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              aria-label="Toggle bold"
              className="px-2"
            >
              <Bold className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('italic')}
              onPressedChange={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              aria-label="Toggle italic"
              className="px-2"
            >
              <Italic className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Italic</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('strike')}
              onPressedChange={() => editor.chain().focus().toggleStrike().run()}
              disabled={!editor.can().chain().focus().toggleStrike().run()}
              aria-label="Toggle strikethrough"
              className="px-2"
            >
              <Strikethrough className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Strikethrough</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('code')}
              onPressedChange={() => editor.chain().focus().toggleCode().run()}
              disabled={!editor.can().chain().focus().toggleCode().run()}
              aria-label="Toggle code"
              className="px-2"
            >
              <Code className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Code</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Highlight color options using Popover */}
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

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('bulletList')}
              onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
              disabled={!editor.can().chain().focus().toggleBulletList().run()}
              aria-label="Toggle bullet list"
              className="px-2"
            >
              <List className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Bullet List</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('orderedList')}
              onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
              disabled={!editor.can().chain().focus().toggleOrderedList().run()}
              aria-label="Toggle ordered list"
              className="px-2"
            >
              <ListOrdered className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Ordered List</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('taskList')}
              onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
              disabled={!editor.can().chain().focus().toggleTaskList().run()}
              aria-label="Toggle todo list"
              className="px-2"
            >
              <ListTodo className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Todo List</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* "More" Dropdown for less common formatting */}
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Toggle size="sm" aria-label="More formatting options" className="px-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Toggle>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>More Formatting</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="start" className="w-auto p-1 flex flex-wrap gap-1">
          <DropdownMenuItem asChild>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    pressed={editor.isActive('blockquote')}
                    onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
                    disabled={!editor.can().chain().focus().toggleBlockquote().run()}
                    aria-label="Toggle blockquote"
                  >
                    <Quote className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Blockquote</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="sm"
                    onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
                    disabled={!editor.can().chain().focus().setHorizontalRule().run()}
                    aria-label="Insert horizontal rule"
                  >
                    <Minus className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Horizontal Rule</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              onPressedChange={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              aria-label="Undo"
              className="px-2"
            >
              <Undo className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              onPressedChange={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              aria-label="Redo"
              className="px-2"
            >
              <Redo className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default RichTextEditorToolbar;