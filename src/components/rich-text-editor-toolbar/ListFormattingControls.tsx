import React from 'react';
import { Editor } from '@tiptap/react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { List, ListOrdered, ListTodo } from 'lucide-react';

interface ListFormattingControlsProps {
  editor: Editor;
}

const ListFormattingControls: React.FC<ListFormattingControlsProps> = ({ editor }) => {
  return (
    <>
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
    </>
  );
};

export default ListFormattingControls;