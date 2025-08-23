import React from 'react';
import { Editor } from '@tiptap/react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Quote, Minus, MoreHorizontal, CodeXml } from 'lucide-react'; // New: Import CodeXml for Code Block

interface MoreFormattingControlsProps {
  editor: Editor;
}

const MoreFormattingControls: React.FC<MoreFormattingControlsProps> = ({ editor }) => {
  return (
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
        <DropdownMenuItem asChild>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={editor.isActive('codeBlock')}
                  onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
                  disabled={!editor.can().chain().focus().toggleCodeBlock().run()}
                  aria-label="Toggle code block"
                >
                  <CodeXml className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Code Block</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MoreFormattingControls;