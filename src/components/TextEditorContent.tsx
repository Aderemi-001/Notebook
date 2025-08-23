import React from 'react';
import { EditorContent, Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface TextEditorContentProps {
  editor: Editor | null;
  editable: boolean;
  className?: string;
  labelId?: string;
  isDrawingMode: boolean;
}

const TextEditorContent: React.FC<TextEditorContentProps> = ({ editor, editable, className, labelId, isDrawingMode }) => {
  if (!editor) return null;

  return (
    <div className={cn(
      "absolute inset-0 p-4", // Moved p-4 here
      isDrawingMode ? "pointer-events-none z-0 opacity-50" : "z-10 opacity-100",
      "transition-opacity duration-300"
    )}>
      <EditorContent 
        editor={editor} 
        className={cn(
          'prose dark:prose-invert max-w-none focus:outline-none h-full', // Removed p-4 and min-h-[300px]
          'user-select-text touch-action-auto',
          !editable && 'bg-muted/50 cursor-not-allowed',
          className
        )}
        aria-labelledby={labelId || ''}
      />
    </div>
  );
};

export default TextEditorContent;