import React from 'react';
import { Editor } from '@tiptap/react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { List, ListOrdered, ListTodo } from 'lucide-react';

interface ListControlsProps {
  editor: Editor;
}

const ListControls: React.FC<ListControlsProps> = ({ editor }) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('bulletList')}
              onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
              disabled={!editor.can().chain().focus().toggleBulletList().run()}
              aria-label="Toggle bullet list"
            >
              <List className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Bullet List</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('orderedList')}
              onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
              disabled={!editor.can().chain().focus().toggleOrderedList().run()}
              aria-label="Toggle ordered list"
            >
              <ListOrdered className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Ordered List</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('taskList')}
              onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
              disabled={!editor.can().chain().focus().toggleTaskList().run()}
              aria-label="Toggle task list"
            >
              <ListTodo className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Task List</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default ListControls;