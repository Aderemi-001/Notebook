import React from 'react';
import { Editor } from '@tiptap/react';
import DrawingModeToggle from '@/components/rich-text-editor-toolbar/DrawingModeToggle';
import HighlightControls from '@/components/rich-text-editor-toolbar/HighlightControls';

interface UtilityControlsProps {
  editor: Editor;
  isDrawingMode: boolean;
  setIsDrawingMode: (isDrawingMode: boolean) => void;
  drawingColor: string;
  setDrawingColor: (color: string) => void;
  penSize: number; // Added penSize prop
  setPenSize: (size: number) => void; // Added setPenSize prop
}

const UtilityControls: React.FC<UtilityControlsProps> = ({ editor, isDrawingMode, setIsDrawingMode, drawingColor, setDrawingColor, penSize, setPenSize }) => {
  return (
    <div className="flex items-center gap-1">
      <HighlightControls editor={editor} />
      <DrawingModeToggle
        isDrawingMode={isDrawingMode}
        setIsDrawingMode={setIsDrawingMode}
        drawingColor={drawingColor}
        setDrawingColor={setDrawingColor}
        penSize={penSize} // Pass penSize
        setPenSize={setPenSize} // Pass setPenSize
      />
    </div>
  );
};

export default UtilityControls;