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
  Heading1,
  Heading2,
  Heading3,
  Pilcrow, // Paragraph icon
  Highlighter, // Generic highlighter icon
  Eraser, // Icon for clearing highlight
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RichTextEditorToolbarProps {
  editor: Editor | null;
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

  const handleHeadingChange = (value: string) => {
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else {
      // Assert the parsed number to be one of the valid heading levels (1, 2, or 3)
      const level = parseInt(value.replace('heading', '')) as 1 | 2 | 3;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  const getActiveHeading = () => {
    if (editor.isActive('paragraph')) return 'paragraph';
    if (editor.isActive('heading', { level: 1 })) return 'heading1';
    if (editor.isActive('heading', { level: 2 })) return 'heading2';
    if (editor.isActive('heading', { level: 3 })) return 'heading3';
    return 'paragraph'; // Default to paragraph if nothing else is active
  };

  const getActiveHeadingIcon = () => {
    if (editor.isActive('heading', { level: 1 })) return <Heading1 className="h-4 w-4 mr-2" />;
    if (editor.isActive('heading', { level: 2 })) return <Heading2 className="h-4 w-4 mr-2" />;
    if (editor.isActive('heading', { level: 3 })) return <Heading3 className="h-4 w-4 mr-2" />;
    return <Pilcrow className="h-4 w-4 mr-2" />; // Default for paragraph
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/20 rounded-t-md">
      <ToggleGroup type="multiple" size="sm" className="flex flex-wrap justify-start">
        <ToggleGroupItem
          value="bold"
          aria-label="Toggle bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
        >
          <Bold className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="italic"
          aria-label="Toggle italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
        >
          <Italic className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="strike"
          aria-label="Toggle strike"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
        >
          <Strikethrough className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="code"
          aria-label="Toggle code"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'is-active' : ''}
        >
          <Code className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="bulletList"
          aria-label="Toggle bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={!editor.can().chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
        >
          <List className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="orderedList"
          aria-label="Toggle ordered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={!editor.can().chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="blockquote"
          aria-label="Toggle blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={!editor.can().chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'is-active' : ''}
        >
          <Quote className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="horizontalRule"
          aria-label="Insert horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={!editor.can().chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </ToggleGroupItem>

        {/* Heading/Paragraph Selector */}
        <Select onValueChange={handleHeadingChange} value={getActiveHeading()}>
          <SelectTrigger className="w-[130px] h-8 px-2 rounded-lg">
            {getActiveHeadingIcon()}
            <SelectValue placeholder="Text Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paragraph">
              <div className="flex items-center">
                <Pilcrow className="h-4 w-4 mr-2" /> Paragraph
              </div>
            </SelectItem>
            <SelectItem value="heading1">
              <div className="flex items-center">
                <Heading1 className="h-4 w-4 mr-2" /> Heading 1
              </div>
            </SelectItem>
            <SelectItem value="heading2">
              <div className="flex items-center">
                <Heading2 className="h-4 w-4 mr-2" /> Heading 2
              </div>
            </SelectItem>
            <SelectItem value="heading3">
              <div className="flex items-center">
                <Heading3 className="h-4 w-4 mr-2" /> Heading 3
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Highlight Color Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 px-2 rounded-lg ${editor.isActive('highlight') ? 'is-active' : ''}`}
            >
              <Highlighter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {highlightColors.map((color) => (
              <DropdownMenuItem
                key={color.name}
                onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
                className="flex items-center cursor-pointer"
              >
                <span
                  className="w-4 h-4 rounded-full mr-2 border"
                  style={{ backgroundColor: color.value }}
                ></span>
                {color.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={() => editor.chain().focus().unsetHighlight().run()}
              className="flex items-center cursor-pointer"
            >
              <Eraser className="h-4 w-4 mr-2" /> Clear Highlight
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="h-8 px-2 rounded-lg"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="h-8 px-2 rounded-lg"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </ToggleGroup>
    </div>
  );
};