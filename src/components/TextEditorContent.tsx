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
      "absolute inset-0 transition-opacity duration-300", // Absolute positioning to layer correctly
      isDrawingMode ? "pointer-events-none opacity-30" : "pointer-events-auto opacity-100", // Control interaction and visibility
    )}>
      <EditorContent 
        editor={editor} 
        className={cn(
          'prose dark:prose-invert max-w-none focus:outline-none p-4 h-full overflow-y-auto', // Added overflow-y-auto
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