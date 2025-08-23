import * as React from 'react'; // Explicitly import React
import { useState, useRef, useEffect, useCallback } from 'react';

interface UseDrawingCanvasProps {
  toolMode: 'pen' | 'eraser' | 'pan'; // New prop to directly control the active tool
  drawingColor: string;
  penSize: number;
  eraserSize: number;
  zoomLevel: number;
  setZoomLevel: (level: number | ((prev: number) => number)) => void;
  panOffset: { x: number; y: number };
  setPanOffset: (offset: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  minZoom: number;
  maxZoom: number;
  onCanvasClickDetected: () => void; // New callback prop
}

// Helper function to safely get clientX and clientY from mouse or touch events
const getEventClientCoords = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
  if ('touches' in event.nativeEvent) {
    const touch = event.nativeEvent.touches[0];
    return { clientX: touch.clientX, clientY: touch.clientY };
  }
  // For MouseEvent, clientX/Y are directly on the nativeEvent object
  return { clientX: event.nativeEvent.clientX, clientY: event.nativeEvent.clientY };
};

export const useDrawingCanvas = ({
  toolMode, // Destructure new toolMode prop
  drawingColor,
  penSize,
  eraserSize,
  zoomLevel,
  setZoomLevel,
  panOffset,
  setPanOffset,
  minZoom,
  maxZoom,
  onCanvasClickDetected,
}: UseDrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false); // True when actively drawing/erasing
  const lastPointerPosition = useRef<{ x: number; y: number } | null>(null); // For panning and drawing

  // State for touch gestures
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [isPinching, setIsPinching] = useState(false);

  // New state to track if a drag/move occurred during a potential click
  const didMoveRef = useRef(false);
  const initialPointerPosition = useRef<{ x: number; y: number } | null>(null);
  const CLICK_MOVE_THRESHOLD = 5; // Pixels

  // Derived states from toolMode
  const isDrawingToolActive = toolMode === 'pen' || toolMode === 'eraser';
  const isErasingToolActive = toolMode === 'eraser';
  const isPanToolActive = toolMode === 'pan';

  const clearCanvas = useCallback(() => {
    if (canvasRef.current && ctxRef.current) {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      // Save current transform
      ctx.save();
      // Reset transform to clear the entire canvas
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Restore original transform
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    const setCanvasDimensions = () => {
      const parentDiv = canvas.parentElement;
      if (parentDiv) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const cssWidth = parentDiv.clientWidth;
        const cssHeight = parentDiv.clientHeight;

        // Set internal canvas dimensions to be higher resolution
        canvas.width = cssWidth * devicePixelRatio;
        canvas.height = cssHeight * devicePixelRatio;

        // Set canvas style dimensions to match parent for display
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        // Scale the context to draw at the higher resolution
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset any previous transforms
        ctx.scale(devicePixelRatio, devicePixelRatio);

        // Re-fill background after scaling
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, cssWidth, cssHeight); // Fill the *logical* area
      }
    };

    setCanvasDimensions(); // Initial setup

    const resizeObserver = new ResizeObserver(setCanvasDimensions);
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.unobserve(canvas);
    };
  }, []);

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = isErasingToolActive ? '#FFFFFF' : drawingColor;
      ctxRef.current.lineWidth = isErasingToolActive ? eraserSize : penSize;
      ctxRef.current.globalCompositeOperation = isErasingToolActive ? 'destination-out' : 'source-over';
    }
  }, [toolMode, drawingColor, isErasingToolActive, eraserSize, penSize]);

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    // Adjust for panOffset and zoomLevel.
    // The ctx is already scaled by devicePixelRatio, so offsetX/Y (in CSS pixels) are correct.
    const x = (offsetX - panOffset.x) / zoomLevel;
    const y = (offsetY - panOffset.y) / zoomLevel;
    return { x, y };
  }, [zoomLevel, panOffset]);

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctxRef.current || !canvasRef.current) return;
    event.preventDefault();

    const { clientX, clientY } = getEventClientCoords(event);
    initialPointerPosition.current = { x: clientX, y: clientY };
    didMoveRef.current = false; // Reset didMove flag

    if ('touches' in event.nativeEvent) {
      if (event.nativeEvent.touches.length === 2) {
        const touch1 = event.nativeEvent.touches[0];
        const touch2 = event.nativeEvent.touches[1];
        const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        setInitialPinchDistance(dist);
        setIsPinching(true);
        lastPointerPosition.current = null; // Stop any single-touch drawing/panning
        setIsDrawing(false);
        return;
      } else if (event.nativeEvent.touches.length === 1) {
        lastPointerPosition.current = { x: clientX, y: clientY };
        if (isDrawingToolActive) { // Only start drawing if pen/eraser is active
          const { x, y } = getCanvasPoint(clientX, clientY);
          ctxRef.current.beginPath();
          ctxRef.current.moveTo(x, y);
          setIsDrawing(true);
        } else if (isPanToolActive) { // Only start panning if pan is active
          // No specific beginPath for panning, just track last position
        }
        setIsPinching(false);
        return;
      }
    } else { // Mouse events
      lastPointerPosition.current = { x: clientX, y: clientY };
      if (isDrawingToolActive) { // Only start drawing if pen/eraser is active
        const { x, y } = getCanvasPoint(clientX, clientY);
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(x, y);
        setIsDrawing(true);
      } else if (isPanToolActive) { // Only start panning if pan is active
        // No specific beginPath for panning, just track last position
      }
      setIsPinching(false);
    }
  }, [getCanvasPoint, isDrawingToolActive, isPanToolActive]);

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctxRef.current || !canvasRef.current) return;
    event.preventDefault();

    const { clientX, clientY } = getEventClientCoords(event);

    // Check for significant movement to set didMoveRef
    if (initialPointerPosition.current && !didMoveRef.current) {
      const dx = clientX - initialPointerPosition.current.x;
      const dy = clientY - initialPointerPosition.current.y;
      if (Math.hypot(dx, dy) > CLICK_MOVE_THRESHOLD) {
        didMoveRef.current = true;
      }
    }

    if ('touches' in event.nativeEvent && event.nativeEvent.touches.length === 2 && isPinching) {
      const touch1 = event.nativeEvent.touches[0];
      const touch2 = event.nativeEvent.touches[1];
      const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

      if (initialPinchDistance !== null) {
        const scaleFactor = currentDist / initialPinchDistance;
        const newZoom = Math.min(Math.max(zoomLevel * scaleFactor, minZoom), maxZoom);

        const { clientX: centerX, clientY: centerY } = {
          clientX: (touch1.clientX + touch2.clientX) / 2,
          clientY: (touch1.clientY + touch2.clientY) / 2,
        };

        // Calculate the canvas point under the center of the pinch before zoom
        const oldCanvasPointX = (centerX - panOffset.x) / zoomLevel;
        const oldCanvasPointY = (centerY - panOffset.y) / zoomLevel;

        setZoomLevel(newZoom);

        // Calculate new pan offset to keep the oldCanvasPoint fixed relative to the screen
        setPanOffset((_prevPan: { x: number; y: number }) => ({
          x: centerX - oldCanvasPointX * newZoom,
          y: centerY - oldCanvasPointY * newZoom,
        }));
        
        setInitialPinchDistance(currentDist);
      }
      return;
    }

    // Only proceed if a pointer is down (isDrawing is true for pen/eraser, or lastPointerPosition.current for pan)
    if (!isDrawing && !lastPointerPosition.current) return;

    if (isDrawing && isDrawingToolActive) { // Drawing/Erasing
      const { x, y } = getCanvasPoint(clientX, clientY);
      ctxRef.current.lineTo(x, y);
      ctxRef.current.stroke();
      lastPointerPosition.current = { x: clientX, y: clientY };
    } else if (lastPointerPosition.current && isPanToolActive && !isPinching) { // Panning
      const dx = clientX - lastPointerPosition.current.x;
      const dy = clientY - lastPointerPosition.current.y;

      setPanOffset((prevPan: { x: number; y: number }) => ({
        x: prevPan.x + dx,
        y: prevPan.y + dy,
      }));
      lastPointerPosition.current = { x: clientX, y: clientY };
    }
  }, [isDrawing, isPinching, initialPinchDistance, zoomLevel, panOffset, isDrawingToolActive, isPanToolActive, getCanvasPoint, minZoom, maxZoom, setZoomLevel, setPanOffset]);

  const endDrawing = useCallback(() => {
    if (isPinching) {
      setIsPinching(false);
      setInitialPinchDistance(null);
    }
    if (ctxRef.current && isDrawingToolActive) { // Only close path if drawing tool was active
      ctxRef.current.closePath();
    }
    setIsDrawing(false);
    lastPointerPosition.current = null;

    // If it was a click (no significant move) and in drawing mode, trigger the callback
    if (isDrawingToolActive && !didMoveRef.current && initialPointerPosition.current) {
      onCanvasClickDetected();
    }
    initialPointerPosition.current = null; // Reset initial position
    didMoveRef.current = false; // Reset didMove flag
  }, [isPinching, isDrawingToolActive, onCanvasClickDetected]);

  return {
    canvasRef,
    ctxRef,
    isDrawing,
    startDrawing,
    draw,
    endDrawing,
    clearCanvas,
    zoomLevel,
    panOffset,
  };
};