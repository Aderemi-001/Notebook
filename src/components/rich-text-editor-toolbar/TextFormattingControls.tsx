import React from 'react';
import { Editor } from '@tiptap/react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bold, Italic, Strikethrough, Code, Underline, Eraser } from 'lucide-react'; // New: Import Underline and Eraser (for clear formatting)

interface TextFormattingControlsProps {
  editor: Editor;
}

const TextFormattingControls: React.FC<TextFormattingControlsProps> = ({ editor }) => {
  return (
    <>
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
              pressed={editor.isActive('underline')} // New: Underline toggle
              onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
              disabled={!editor.can().chain().focus().toggleUnderline().run()}
              aria-label="Toggle underline"
              className="px-2"
            >
              <Underline className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Underline</TooltipContent>
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

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              onPressedChange={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} // New: Clear formatting
              disabled={!editor.can().chain().focus().unsetAllMarks().clearNodes().run()}
              aria-label="Clear formatting"
              className="px-2"
            >
              <Eraser className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Clear Formatting</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};

export default TextFormattingControls;