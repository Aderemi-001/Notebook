import React from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list'; // Import TaskList
import TaskItem from '@tiptap/extension-task-item'; // Import TaskItem
import { cn } from '@/lib/utils';
import RichTextEditorToolbar from './RichTextEditorToolbar'; // Import the new toolbar component

interface RichTextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  editable?: boolean;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onContentChange, editable = true, className }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-gray-300 pl-4 italic text-muted-foreground',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm overflow-x-auto',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'mb-2',
          },
        },
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            1: { class: 'text-3xl font-bold mb-4 mt-6' },
            2: { class: 'text-2xl font-semibold mb-3 mt-5' },
            3: { class: 'text-xl font-semibold mb-2 mt-4' },
            4: { class: 'text-lg font-semibold mb-1 mt-3' },
            5: { class: 'text-base font-semibold mb-1 mt-2' },
            6: { class: 'text-sm font-semibold mb-1 mt-1' },
          },
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TaskList, // Add TaskList extension
      TaskItem.configure({ // Configure TaskItem
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2', // Apply flexbox for alignment
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    editable: editable,
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4 border rounded-md', // Changed p-6 back to p-4
          'user-select-text touch-action-auto', // Add these classes for improved mobile selection
          !editable && 'bg-muted/50 cursor-not-allowed',
          className
        ),
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full">
      {editable && (
        <RichTextEditorToolbar editor={editor} />
      )}
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;