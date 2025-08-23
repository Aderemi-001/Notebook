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
        "absolute top-0 left-0 bg-white dark:bg-gray-900",
        isDrawingMode ? "z-20 pointer-events-auto" : "z-0 pointer-events-none"
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
        touchAction: 'none',
        width: '100%',
        height: '100%',
        cursor: customCursorStyle,
      }}
    />
  );
};

export default DrawingCanvas;