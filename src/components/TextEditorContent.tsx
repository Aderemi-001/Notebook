import * as React from 'react';
import { EditorContent, Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface TextEditorContentProps {
  editor: Editor | null;
  editable: boolean; // New prop
  className?: string;
  labelId?: string;
  isDrawingMode: boolean;
}

const TextEditorContent: React.FC<TextEditorContentProps> = ({ editor, editable, className, labelId, isDrawingMode }) => {
  if (!editor) return null;

  const handleContextMenu = (event: React.MouseEvent) => {
    // Prevent the default context menu from appearing
    event.preventDefault();
  };

  return (
    <div className={cn(
      "absolute inset-0 transition-opacity duration-300",
      isDrawingMode ? "pointer-events-none opacity-30" : "pointer-events-auto opacity-100",
    )}>
      <EditorContent
        editor={editor}
        className={cn(
          'prose dark:prose-invert max-w-none focus:outline-none p-4 h-full overflow-y-auto w-full',
          'user-select-text touch-action-auto',
          !editable && 'bg-muted/50 cursor-not-allowed', // Apply disabled styling based on editable prop
          className
        )}
        aria-labelledby={labelId || ''}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
};

export default TextEditorContent;