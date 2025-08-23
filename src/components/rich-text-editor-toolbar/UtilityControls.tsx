import React from 'react';
import { Editor } from '@tiptap/react';
import DrawingModeToggle from '@/components/rich-text-editor-toolbar/DrawingModeToggle';
import HighlightControls from '@/components/rich-text-editor-toolbar/HighlightControls';

interface UtilityControlsProps {
  editor: Editor;
  isDrawingMode: boolean;
  setIsDrawingMode: (isDrawingMode: boolean) => void;
  // Removed drawingColor, setDrawingColor, penSize, setPenSize as they are not passed to DrawingModeToggle from here.
}

const UtilityControls: React.FC<UtilityControlsProps> = ({ editor, isDrawingMode, setIsDrawingMode }) => {
  return (
    <div className="flex items-center gap-1">
      <HighlightControls editor={editor} />
      <DrawingModeToggle
        isDrawingMode={isDrawingMode}
        setIsDrawingMode={setIsDrawingMode}
        // drawingColor and penSize are no longer passed to DrawingModeToggle
      />
    </div>
  );
};

export default UtilityControls;