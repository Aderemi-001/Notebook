import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Minus,
  Redo,
  Undo,
  Highlighter, // Generic highlighter icon
  Eraser, // Icon for clearing highlight
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RichTextEditorToolbarProps {
  editor: Editor | null;
  // Removed: editable?: boolean;
}

const highlightColors = [
  { name: 'Yellow', value: '#fff3b0' },
  { name: 'Green', value: '#c8e6c9' },
  { name: 'Blue', value: '#bbdefb' },
  { name: 'Red', value: '#ffcdd2' },
  { name: 'Purple', value: '#e1bee7' },
];

export const RichTextEditorToolbar: React.FC<RichTextEditorToolbarProps> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/20 rounded-t-md">
      <ToggleGroup type="multiple" size="sm" className="flex flex-wrap justify-start">
        <ToggleGroupItem
          value="bold"
          aria-label="Toggle bold"
          onClick={() => editor.chain().toggleBold().run()}
          disabled={!editor.can().toggleBold()}
          className={editor.isActive('bold') ? 'is-active' : ''}
        >
          <Bold className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="italic"
          aria-label="Toggle italic"
          onClick={() => editor.chain().toggleItalic().run()}
          disabled={!editor.can().toggleItalic()}
          className={editor.isActive('italic') ? 'is-active' : ''}
        >
          <Italic className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="strike"
          aria-label="Toggle strike"
          onClick={() => editor.chain().toggleStrike().run()}
          disabled={!editor.can().toggleStrike()}
          className={editor.isActive('strike') ? 'is-active' : ''}
        >
          <Strikethrough className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="code"
          aria-label="Toggle code"
          onClick={() => editor.chain().toggleCode().run()}
          disabled={!editor.can().toggleCode()}
          className={editor.isActive('code') ? 'is-active' : ''}
        >
          <Code className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="bulletList"
          aria-label="Toggle bullet list"
          onClick={() => editor.chain().toggleBulletList().run()}
          disabled={!editor.can().toggleBulletList()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
        >
          <List className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="orderedList"
          aria-label="Toggle ordered list"
          onClick={() => editor.chain().toggleOrderedList().run()}
          disabled={!editor.can().toggleOrderedList()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="blockquote"
          aria-label="Toggle blockquote"
          onClick={() => editor.chain().toggleBlockquote().run()}
          disabled={!editor.can().toggleBlockquote()}
          className={editor.isActive('blockquote') ? 'is-active' : ''}
        >
          <Quote className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="horizontalRule"
          aria-label="Insert horizontal rule"
          onClick={() => editor.chain().setHorizontalRule().run()}
          disabled={!editor.can().setHorizontalRule()}
        >
          <Minus className="h-4 w-4" />
        </ToggleGroupItem>

        {/* Highlight Color Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 px-2 rounded-lg ${editor.isActive('highlight') ? 'is-active' : ''}`}
              disabled={!editor.can().toggleHighlight()}
            >
              <Highlighter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {highlightColors.map((color) => (
              <DropdownMenuItem
                key={color.name}
                onClick={() => editor.chain().toggleHighlight({ color: color.value }).run()}
                className="flex items-center cursor-pointer"
                disabled={!editor.can().toggleHighlight({ color: color.value })}
              >
                <span
                  className="w-4 h-4 rounded-full mr-2 border"
                  style={{ backgroundColor: color.value }}
                ></span>
                {color.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={() => editor.chain().unsetHighlight().run()}
              className="flex items-center cursor-pointer"
              disabled={!editor.can().unsetHighlight()}
            >
              <Eraser className="h-4 w-4 mr-2" /> Clear Highlight
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={() => editor.chain().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 px-2 rounded-lg"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => editor.chain().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 px-2 rounded-lg"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </ToggleGroup>
    </div>
  );
};