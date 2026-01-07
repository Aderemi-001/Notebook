import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Pen, Save, Trash2 } from 'lucide-react';
import { Slider } from "@/components/ui/slider";

interface DigitalCanvasProps {
    width?: number; // Optional: If provided, fixes size. If not, fills parent.
    height?: number;
    onSave?: (dataUrl: string) => void;
    initialData?: string;
    className?: string;
}

interface Point {
    x: number;
    y: number;
    pressure: number;
}

const DigitalCanvas: React.FC<DigitalCanvasProps> = ({
    width,
    height,
    onSave,
    initialData,
    className
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: width || 800, height: height || 600 });
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);
    const [eraserWidth, setEraserWidth] = useState(20);

    const [canvasState, setCanvasState] = useState<string | null>(initialData || null);

    const lastPoint = useRef<Point | null>(null);
    const isCanvasReady = useRef(false);

    // Sync initialData when it arrives asynchronously (Fixes partial load / refresh blanking)
    useEffect(() => {
        if (initialData && !canvasState) {
            setCanvasState(initialData);
        }
    }, [initialData]);

    // Responsive Logic
    useEffect(() => {
        if (width && height) {
            setDimensions({ width, height });
            return;
        }

        const container = containerRef.current;
        if (!container) return;

        const updateSize = () => {
            const rect = container.getBoundingClientRect();
            // Important: Avoid 0x0.
            if (rect.width > 0 && rect.height > 0) {
                // Round dimensions to integers to avoid sub-pixel blurring loops
                const newWidth = Math.floor(rect.width);
                const newHeight = Math.floor(rect.height);

                // Save current content before resizing!
                const currentCanvas = canvasRef.current;
                let tempSnapshot: string | null = null;

                // CRITICAL FIX: Only snapshot if canvas has been rendered at least once.
                // Otherwise we overwrite initialData with a blank canvas on mount.
                if (currentCanvas && isCanvasReady.current) {
                    tempSnapshot = currentCanvas.toDataURL();
                }

                setDimensions({ width: newWidth, height: newHeight });

                // Restore content
                if (tempSnapshot) setCanvasState(tempSnapshot);
            }
        };

        // Initial size
        updateSize();

        const observer = new ResizeObserver(() => {
            requestAnimationFrame(updateSize);
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [width, height]);


    // Canvas Initialization & Restoration
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Restore content
            if (canvasState) {
                // Mark as not ready (loading) to prevent blank snapshots during resize/save
                isCanvasReady.current = false;

                const img = new Image();
                img.src = canvasState;
                img.onload = () => {
                    // CRITICAL: Clear before drawing to prevent "Strict Mode" double-draw duplication
                    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
                    ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
                    isCanvasReady.current = true;
                };
            } else {
                // Transparent background (let CSS bg show through)
                ctx.clearRect(0, 0, dimensions.width, dimensions.height);
                isCanvasReady.current = true;
            }
        }

        canvas.style.width = `${dimensions.width}px`;
        canvas.style.height = `${dimensions.height}px`;

    }, [dimensions, canvasState]); // canvasState omitted (handled by mount/restore logic)

    // Drawing Logic (Standard)
    const getPoint = (e: React.PointerEvent): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            pressure: e.pressure || 0.5
        };
    };

    const startDrawing = (e: React.PointerEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        lastPoint.current = getPoint(e);
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
    };

    const draw = (e: React.PointerEvent) => {
        if (!isDrawing || !lastPoint.current) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const currentPoint = getPoint(e);
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = eraserWidth;
            ctx.strokeStyle = 'black';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth * (0.5 + currentPoint.pressure);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        lastPoint.current = currentPoint;
    };

    // Track latest state for unmount saving AND auto-saving
    const latestDataRef = useRef<string | null>(initialData || null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Update the ref whenever we essentially 'finish' a stroke or change content
    const updateInternalState = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            latestDataRef.current = dataUrl;
            // NOTE: We do NOT setCanvasState here anymore.
            // Setting state triggers the useEffect that clears and redraws the image, causing the "Haze" / flickering.
            // We trust the current canvas context is correct.
        }
    };

    const performSave = () => {
        if (latestDataRef.current && onSave) {
            onSave(latestDataRef.current);
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        lastPoint.current = null;
        updateInternalState();

        // Debounced Auto-Save (1.5s)
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(performSave, 1500);
    };

    // Save on Unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            performSave();
        };
    }, []);

    const handleManualSave = () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        performSave();
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, dimensions.width * (window.devicePixelRatio || 1), dimensions.height * (window.devicePixelRatio || 1));
            latestDataRef.current = null;
            setCanvasState(null);
            // We might want to save the 'cleared' state immediately or let unmount handle it.
            // Let's let unmount handle it to be consistent, or manual save.
        }
    };

    // Cursor Overlay Logic
    const cursorOverlayRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState(false);

    const handlePointerMove = (e: React.PointerEvent) => {
        // Pass through to draw logic if we are drawing
        if (isDrawing) draw(e);

        // Update Cursor Overlay
        if (cursorOverlayRef.current) {
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Use translate to move the cursor (more performant than top/left)
                cursorOverlayRef.current.style.transform = `translate(${x}px, ${y}px)`;
            }
        }
    };

    const handlePointerEnter = () => setIsHovering(true);
    const handlePointerLeave = () => {
        setIsHovering(false);
        stopDrawing();
    }

    return (
        <div ref={containerRef} className={`flex flex-col gap-4 h-full w-full ${className} relative`}>
            {/* Extended Toolbar with Visible Slider */}
            {/* Extended Toolbar with Visible Slider */}
            <div className="flex items-center justify-center gap-2 p-2 bg-secondary/80 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl mx-auto w-fit max-w-full overflow-x-auto transition-all safe-area-bottom mb-2">
                <Button variant={tool === 'pen' ? "default" : "ghost"} size="icon" onClick={() => setTool('pen')} className="rounded-xl flex-shrink-0 h-10 w-10 md:h-9 md:w-9"><Pen className="h-5 w-5 md:h-4 md:w-4" /></Button>
                <Button variant={tool === 'eraser' ? "default" : "ghost"} size="icon" onClick={() => setTool('eraser')} className="rounded-xl flex-shrink-0 h-10 w-10 md:h-9 md:w-9"><Eraser className="h-5 w-5 md:h-4 md:w-4" /></Button>

                <div className="w-px h-6 md:h-5 bg-border mx-1 flex-shrink-0" />

                {/* Visible Slider: 80px width to fit nicely */}
                <div className="flex items-center gap-2 px-2 w-[120px] md:w-[100px] flex-shrink-0">
                    <Slider
                        value={[tool === 'pen' ? lineWidth : eraserWidth]}
                        min={tool === 'pen' ? 1 : 10}
                        max={tool === 'pen' ? 25 : 100}
                        step={tool === 'pen' ? 1 : 5}
                        onValueChange={(vals) => tool === 'pen' ? setLineWidth(vals[0]) : setEraserWidth(vals[0])}
                        className="cursor-pointer touch-none"
                    />
                </div>

                <div className="w-px h-6 md:h-5 bg-border mx-1 flex-shrink-0" />

                <div className="flex gap-2 md:gap-1 flex-shrink-0">
                    {['#000000', '#2563eb', '#dc2626', '#16a34a'].map(c => (
                        <button key={c} className={`w-8 h-8 md:w-5 md:h-5 rounded-full border ${color === c ? 'ring-2 ring-primary ring-offset-1' : ''}`} style={{ backgroundColor: c }} onClick={() => { setColor(c); setTool('pen'); }} />
                    ))}
                </div>

                <div className="w-px h-6 md:h-5 bg-border mx-1 flex-shrink-0" />

                <Button variant="ghost" size="icon" onClick={clearCanvas} className="rounded-xl hover:bg-destructive/10 hover:text-destructive flex-shrink-0 h-10 w-10 md:h-9 md:w-9" title="Clear Canvas"><Trash2 className="h-5 w-5 md:h-4 md:w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={handleManualSave} className="rounded-xl flex-shrink-0 h-10 w-10 md:h-9 md:w-9" title="Save"><Save className="h-5 w-5 md:h-4 md:w-4" /></Button>
            </div>

            {/* Canvas - Simple Full Screen */}
            <div className="flex-1 overflow-hidden relative bg-white touch-none cursor-none">
                {/* Eraser Size Indicator */}
                <div
                    ref={cursorOverlayRef}
                    className="pointer-events-none absolute top-0 left-0 border border-black/50 bg-black/5 rounded-full z-40 transition-opacity duration-75"
                    style={{
                        width: `${eraserWidth}px`,
                        height: `${eraserWidth}px`,
                        // Center the circle on the cursor: (-width/2, -height/2)
                        // But we are setting 'transform' in JS to (x, y), so we need margin-offset or modify JS.
                        // Easier: use margin-left/top to offset.
                        marginLeft: `-${eraserWidth / 2}px`,
                        marginTop: `-${eraserWidth / 2}px`,
                        opacity: (tool === 'eraser' && isHovering) ? 1 : 0,
                    }}
                />

                <canvas
                    ref={canvasRef}
                    onPointerDown={startDrawing}
                    onPointerMove={handlePointerMove}
                    onPointerUp={stopDrawing}
                    onPointerEnter={handlePointerEnter}
                    onPointerLeave={handlePointerLeave}
                    className="block touch-none"
                    style={{
                        width: '100%',
                        height: '100%',
                        cursor: tool === 'eraser'
                            ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>') 0 24, auto`
                            : `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>') 0 24, auto`
                    }}
                />
            </div>
        </div>
    );
};

export default DigitalCanvas;
