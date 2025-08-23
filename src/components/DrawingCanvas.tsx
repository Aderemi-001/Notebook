import React from 'react';
import { cn } from '@/lib/utils';

interface DrawingCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isDrawingMode: boolean;
  customCursorStyle: string;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  onMouseDown: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  onTouchStart: (event: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchMove: (event: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchEnd: (event: React.TouchEvent<HTMLCanvasElement>) => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  canvasRef,
  isDrawingMode,
  customCursorStyle,
  zoomLevel,
  panOffset,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => {
  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "absolute inset-0 bg-white dark:bg-gray-900 transition-opacity duration-300", // Absolute positioning
        isDrawingMode ? "z-20 pointer-events-auto opacity-100" : "z-0 pointer-events-none opacity-0" // Control interaction and visibility
      )}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ 
        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`, 
        transformOrigin: '0 0',
        touchAction: 'none', // Prevent default touch behaviors like scrolling/zooming
        cursor: customCursorStyle,
      }}
    />
  );
};

export default DrawingCanvas;