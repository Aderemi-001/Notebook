import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stroke, Drawing, BgStyle, Point } from '@/types/canvas';
import { smoothPoints, compressDrawing, getPointerWorldPos, createDotsPattern } from '@/utils/canvasUtils';
import { detectShape, ShapeKind } from '@/utils/shapeRecognition';
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar';
import { CanvasZoomControls } from '@/components/canvas/CanvasZoomControls';

interface DigitalCanvasProps {
    initialData?: string;
    onSave?: (data: string) => void;
    className?: string;
}

const DigitalCanvas: React.FC<DigitalCanvasProps> = ({
    initialData,
    onSave,
    className
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [drawing, setDrawing] = useState<Drawing>({
        version: 2,
        pages: [{ id: '1', strokes: [] }],
        currentPageIndex: 0
    });
    const [history, setHistory] = useState<Drawing[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Tools
    const [color, setColor] = useState('#000000');
    const [brushRadius, setBrushRadius] = useState(2.5);
    const [eraserRadius, setEraserRadius] = useState(20);
    const [tool, setTool] = useState<'pen' | 'eraser' | 'ruler' | 'hand'>('pen');
    const [bgStyle, setBgStyle] = useState<BgStyle>('dots');

    const [suggestion, setSuggestion] = useState<{
        indexGroup: number[];
        kind: ShapeKind;
        replacement: Stroke;
    } | null>(null);

    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Camera State
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

    // Refs
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedData = useRef<string | undefined>(undefined);
    const onSaveRef = useRef(onSave);
    const isInitialLoad = useRef(true);
    const panStartRef = useRef<{ x: number; y: number } | null>(null);
    const offsetStartRef = useRef<{ x: number; y: number } | null>(null);
    const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
    const touchStateRef = useRef<{
        active: boolean;
        startScale: number;
        startOffset: { x: number; y: number };
        startDist: number;
        startCenter: { x: number; y: number };
    } | null>(null);

    useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

    // Load Data & Migration
    useEffect(() => {
        if (!initialData || !isInitialLoad.current) return;
        isInitialLoad.current = false;
        if (initialData === lastSavedData.current) return;

        try {
            if (initialData.trim().startsWith('{')) {
                const parsed = JSON.parse(initialData);
                let migrated: Drawing;

                if (parsed.version === 1 || (parsed.strokes && !parsed.pages)) {
                    migrated = {
                        version: 2,
                        pages: [{ id: '1', strokes: parsed.strokes || [] }],
                        currentPageIndex: 0,
                        background: parsed.background || 'dots'
                    };
                } else if (parsed.pages) {
                    migrated = parsed;
                } else {
                    return;
                }

                setDrawing(migrated);
                if (migrated.background) setBgStyle(migrated.background);
                lastSavedData.current = initialData;
            }
        } catch (e) {
            console.error("Failed to parse initial canvas data", e);
        }
    }, [initialData]);

    // --- Helper for drawing a stroke ---
    const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
        let pts = stroke.points;
        if (pts.length < 2) return;
        pts = smoothPoints(smoothPoints(pts));

        const interpolated: Point[] = [pts[0]];
        const maxStep = stroke.baseWidth / 3;

        for (let i = 1; i < pts.length; i++) {
            const p0 = interpolated[interpolated.length - 1];
            const p1 = pts[i];
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const dist = Math.hypot(dx, dy);
            const steps = Math.max(1, Math.floor(dist / maxStep));

            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                interpolated.push({
                    x: p0.x + dx * t,
                    y: p0.y + dy * t,
                    t: p0.t + (p1.t - p0.t) * t,
                    p: p0.p + ((p1.p ?? 0.5) - (p0.p ?? 0.5)) * t,
                });
            }
        }
        pts = interpolated;

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (stroke.isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = '#000000';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.color;
        }

        for (let i = 1; i < pts.length; i++) {
            const p0 = pts[i - 1];
            const p1 = pts[i];
            const pressure = p1.p ?? 0.5;

            let width: number;
            if (stroke.pointerType === 'pen') {
                const dt = p1.t - p0.t || 1;
                const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
                const speed = dist / dt;
                width = stroke.baseWidth * (0.6 + 0.9 * pressure) * (1 / (1 + speed / 2));
            } else {
                width = stroke.baseWidth * (0.9 + 0.1 * pressure);
            }

            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
        }
    };

    // --- Rendering Engine (Optimized Dual-Canvas) ---
    // 1. Offscreen Cache (Background + Committed Strokes)
    const lastRenderedPageRef = useRef<number>(-1);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        if (!bgCanvasRef.current) bgCanvasRef.current = document.createElement('canvas');
        const bgCanvas = bgCanvasRef.current;

        lastRenderedPageRef.current = drawing.currentPageIndex;

        if (bgCanvas.width !== rect.width * dpr || bgCanvas.height !== rect.height * dpr) {
            bgCanvas.width = rect.width * dpr;
            bgCanvas.height = rect.height * dpr;
        }

        const ctx = bgCanvas.getContext('2d', { alpha: false }); // Optimization: no alpha for bg
        if (!ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        // Immediate clear on page switch to avoid "ghosting"
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);

        ctx.save();
        ctx.translate(rect.width / 2, rect.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-rect.width / 2 + offset.x, -rect.height / 2 + offset.y);

        // Pattern
        const tl = getPointerWorldPos(rect.left, rect.top, rect, scale, offset);
        const br = getPointerWorldPos(rect.right, rect.bottom, rect, scale, offset);
        const buffer = 100;
        const startX = tl.x - buffer;
        const startY = tl.y - buffer;
        const endX = br.x + buffer;
        const endY = br.y + buffer;

        if (bgStyle === 'dots') {
            const pat = createDotsPattern(ctx);
            if (pat) {
                ctx.fillStyle = pat;
                ctx.fillRect(startX, startY, endX - startX, endY - startY);
            }
        } else if (bgStyle === 'lines' || bgStyle === 'grid') {
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            const spacing = bgStyle === 'lines' ? 28 : 32;
            ctx.beginPath();
            for (let y = Math.floor(startY / spacing) * spacing; y < endY; y += spacing) {
                ctx.moveTo(startX, y); ctx.lineTo(endX, y);
            }
            if (bgStyle === 'grid') {
                for (let x = Math.floor(startX / spacing) * spacing; x < endX; x += spacing) {
                    ctx.moveTo(x, startY); ctx.lineTo(x, endY);
                }
            }
            ctx.stroke();
        }

        // Draw current page strokes
        const strokes = drawing.pages[drawing.currentPageIndex]?.strokes || [];
        strokes.forEach(s => drawStroke(ctx, s));

        ctx.restore();
    }, [drawing, bgStyle, scale, offset]);

    // 2. High-Frequency Foreground Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !bgCanvasRef.current) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();

        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Layer 1: Background Cache
        ctx.drawImage(bgCanvasRef.current, 0, 0, rect.width, rect.height);

        // Layer 2: Active Stroke
        if (currentStroke) {
            ctx.save();
            ctx.translate(rect.width / 2, rect.height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-rect.width / 2 + offset.x, -rect.height / 2 + offset.y);
            drawStroke(ctx, currentStroke);
            ctx.restore();
        }

        // Layer 3: UI Cursor
        if (cursorPos) {
            ctx.save();
            const radius = (tool === 'eraser' ? eraserRadius : brushRadius) * scale;
            ctx.beginPath();
            ctx.arc(cursorPos.x, cursorPos.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = tool === 'eraser' ? '#000000' : color;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }, [currentStroke, cursorPos, scale, offset, tool, color, brushRadius, eraserRadius, drawing.currentPageIndex]);

    // --- Actions ---
    const pushToHistory = (newDrawing: Drawing) => {
        const nextHist = history.slice(0, historyIndex + 1);
        nextHist.push(JSON.parse(JSON.stringify(newDrawing)));
        if (nextHist.length > 50) nextHist.shift();
        setHistory(nextHist);
        setHistoryIndex(nextHist.length - 1);
    };

    const handleChange = (newDrawing: Drawing) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            if (onSaveRef.current) {
                const json = JSON.stringify(compressDrawing(newDrawing));
                lastSavedData.current = json;
                onSaveRef.current(json);
            }
        }, 1000);
    };

    const addPage = () => {
        setDrawing(prev => {
            const next = {
                ...prev,
                pages: [...prev.pages, { id: Math.random().toString(36).substr(2, 9), strokes: [] }],
                currentPageIndex: prev.pages.length
            };
            pushToHistory(next);
            handleChange(next);
            return next;
        });
    };

    const switchPage = (index: number) => {
        if (index < 0 || index >= drawing.pages.length) return;
        setDrawing(prev => ({ ...prev, currentPageIndex: index }));
    };

    const deletePage = () => {
        setDrawing(prev => {
            if (prev.pages.length <= 1) return prev;
            const newPages = prev.pages.filter((_, i) => i !== prev.currentPageIndex);
            const newIndex = Math.max(0, prev.currentPageIndex - 1);
            const next = { ...prev, pages: newPages, currentPageIndex: newIndex };
            pushToHistory(next);
            handleChange(next);
            return next;
        });
    };

    const handleUndo = () => {
        if (historyIndex <= 0) return;
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setDrawing(history[nextIdx]);
    };

    const handleRedo = () => {
        if (historyIndex >= history.length - 1) return;
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setDrawing(history[nextIdx]);
    };

    const confirmClear = () => {
        setDrawing(prev => {
            const next = { ...prev };
            next.pages[prev.currentPageIndex].strokes = [];
            pushToHistory(next);
            handleChange(next);
            return next;
        });
        setShowClearConfirm(false);
    };

    // --- Input Handlers ---
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const delta = e.deltaY;
        const zoomFactor = 1.05;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setScale(prev => {
            let next = delta > 0 ? prev / zoomFactor : prev * zoomFactor;
            next = Math.min(10, Math.max(0.1, next));
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const dx = (x - cx) / prev;
            const dy = (y - cy) / prev;
            setOffset(off => ({
                x: off.x + dx * (1 - prev / next),
                y: off.y + dy * (1 - prev / next),
            }));
            return next;
        });
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        // Track pointer
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        // Check for Multi-Touch Gesture (Pinch)
        if (activePointers.current.size === 2) {
            const points = Array.from(activePointers.current.values());
            const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            const cx = (points[0].x + points[1].x) / 2;
            const cy = (points[0].y + points[1].y) / 2;

            touchStateRef.current = {
                active: true,
                startScale: scale,
                startOffset: { ...offset },
                startDist: dist,
                startCenter: { x: cx, y: cy }
            };

            // Cancel any active drawing
            setCurrentStroke(null);
            setIsDrawing(false);
            setIsPanning(false); // Hand tool pan handled by gesture logic if 2 fingers
            return;
        }

        if (e.button === 1 || e.buttons === 4 || e.shiftKey || tool === 'hand') {
            e.preventDefault();
            setIsPanning(true);
            panStartRef.current = { x: e.clientX, y: e.clientY };
            offsetStartRef.current = { ...offset };
            return;
        }

        // If gesture active or not primary button, ignore
        if (touchStateRef.current?.active || e.button !== 0) return;

        e.preventDefault();
        const rect = canvasRef.current!.getBoundingClientRect();
        const pt = getPointerWorldPos(e.clientX, e.clientY, rect, scale, offset);
        const p = e.pressure && e.pressure > 0.5 ? e.pressure : 0.5;

        // Start Stroke
        const stroke: Stroke = {
            color: tool === 'eraser' ? '#000000' : color,
            baseWidth: tool === 'eraser' ? eraserRadius : brushRadius,
            points: [{ x: pt.x, y: pt.y, t: performance.now(), p }],
            isEraser: tool === 'eraser',
            pointerType: (e.pointerType as any) || 'mouse'
        };
        setCurrentStroke(stroke);
        setIsDrawing(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

        // Update tracked pointer
        if (activePointers.current.has(e.pointerId)) {
            activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }

        // Handle Pinch Zoom
        if (touchStateRef.current?.active && activePointers.current.size === 2) {
            const points = Array.from(activePointers.current.values());
            const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            const cx = (points[0].x + points[1].x) / 2;
            const cy = (points[0].y + points[1].y) / 2;

            const state = touchStateRef.current;
            const zoomRatio = dist / state.startDist;
            let newScale = state.startScale * zoomRatio;
            newScale = Math.min(10, Math.max(0.1, newScale));

            // Calculate new offset to keep center stable
            // This is simplified; robust pinch zoom often needs more complex matrix math
            // But for this relative offset system:
            // The world point under the start center should remain under the current center
            // worldPt = (screen - center)/scale - offset

            // We want the world point under startCenter (at startScale) to be under cx (at newScale)
            // worldX = (state.startCenter.x - rect.left - rect.width/2)/state.startScale - state.startOffset.x
            // newOffsetX = (cx - rect.left - rect.width/2)/newScale - worldX

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const startWorldX = (state.startCenter.x - rect.left - centerX) / state.startScale - state.startOffset.x;
            const startWorldY = (state.startCenter.y - rect.top - centerY) / state.startScale - state.startOffset.y;

            const newOffsetX = (cx - rect.left - centerX) / newScale - startWorldX;
            const newOffsetY = (cy - rect.top - centerY) / newScale - startWorldY;

            setScale(newScale);
            setOffset({ x: newOffsetX, y: newOffsetY });
            return;
        }

        if (isPanning && panStartRef.current && offsetStartRef.current) {
            const dx = (e.clientX - panStartRef.current.x) / scale;
            const dy = (e.clientY - panStartRef.current.y) / scale;
            setOffset({ x: offsetStartRef.current.x + dx, y: offsetStartRef.current.y + dy });
            return;
        }

        if (!isDrawing || !currentStroke) return;
        const native = e.nativeEvent as any;
        const events = native.getCoalescedEvents ? native.getCoalescedEvents() : [e];
        const newPoints = events.map((ev: any) => {
            const pt = getPointerWorldPos(ev.clientX, ev.clientY, rect, scale, offset);
            return { x: pt.x, y: pt.y, t: performance.now(), p: ev.pressure || 0.5 };
        });

        if (tool === 'ruler') {
            setCurrentStroke({ ...currentStroke, points: [currentStroke.points[0], newPoints[newPoints.length - 1]] });
        } else {
            setCurrentStroke(prev => prev ? ({ ...prev, points: [...prev.points, ...newPoints] }) : null);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        activePointers.current.delete(e.pointerId);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        // If gesture was active
        if (touchStateRef.current?.active) {
            if (activePointers.current.size < 2) {
                touchStateRef.current = null; // End gesture
            }
            return; // Don't finalize stroke
        }

        if (isPanning) {
            setIsPanning(false);
            panStartRef.current = null;
            return;
        }

        if (!isDrawing || !currentStroke) return;

        setDrawing(prev => {
            const next = { ...prev };
            const page = { ...next.pages[prev.currentPageIndex] };
            page.strokes = [...page.strokes, currentStroke];
            next.pages[prev.currentPageIndex] = page;
            pushToHistory(next);
            handleChange(next);
            return next;
        });

        // Shape Recognition Logic
        if (tool === 'pen') {
            const detected = detectShape(currentStroke);
            if (detected) {
                setSuggestion({
                    indexGroup: [drawing.pages[drawing.currentPageIndex].strokes.length],
                    kind: detected.kind,
                    replacement: detected.replacement
                });
            }
        }

        setCurrentStroke(null);
        setIsDrawing(false);
    };

    return (
        <div
            ref={containerRef}
            className={`h-full w-full relative overflow-hidden bg-white touch-none ${className} ${tool === 'hand' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
        >
            <canvas
                ref={canvasRef}
                className="block w-full h-full touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => setCursorPos(null)}
            />

            <CanvasZoomControls
                scale={scale}
                onReset={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
            />

            <CanvasToolbar
                tool={tool} setTool={setTool}
                color={color} setColor={setColor}
                brushRadius={brushRadius} setBrushRadius={setBrushRadius}
                eraserRadius={eraserRadius} setEraserRadius={setEraserRadius}
                bgStyle={bgStyle} setBgStyle={(style) => {
                    setBgStyle(style);
                    setDrawing(prev => {
                        const next = { ...prev, background: style };
                        handleChange(next);
                        return next;
                    });
                }}
                onUndo={handleUndo} onRedo={handleRedo}
                onClear={() => setShowClearConfirm(true)}
                onSave={() => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png');
                    a.download = `page-${drawing.currentPageIndex + 1}.png`;
                    a.click();
                }}
                currentPage={drawing.currentPageIndex}
                totalPages={drawing.pages.length}
                onAddPage={addPage}
                onSwitchPage={switchPage}
                onDeletePage={deletePage}
            />

            {suggestion && (() => {
                const rect = containerRef.current!.getBoundingClientRect();
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const allPoints = currentStroke?.points || suggestion.replacement.points;
                const minX = Math.min(...allPoints.map(p => p.x));
                const maxY = Math.max(...allPoints.map(p => p.y));
                const screenX = scale * (minX - cx + offset.x) + cx;
                const screenY = scale * (maxY - cy + offset.y) + cy;

                return (
                    <div className="absolute z-20 bg-white/90 backdrop-blur shadow-premium rounded-full px-3 py-1.5 text-xs flex gap-3 items-center border border-gray-100 animate-in zoom-in duration-200" style={{ left: screenX, top: screenY + 20 }}>
                        <span className="text-gray-500 font-bold uppercase tracking-tighter">Fix shape?</span>
                        <div className="flex gap-1.5">
                            <button className="text-primary font-black hover:scale-110 transition-transform" onClick={() => {
                                setDrawing(prev => {
                                    const next = { ...prev };
                                    const page = { ...next.pages[prev.currentPageIndex] };
                                    page.strokes[page.strokes.length - 1] = suggestion.replacement;
                                    next.pages[prev.currentPageIndex] = page;
                                    handleChange(next);
                                    return next;
                                });
                                setSuggestion(null);
                            }}>YES</button>
                            <button className="text-gray-300 font-bold hover:text-gray-500" onClick={() => setSuggestion(null)}>NO</button>
                        </div>
                    </div>
                );
            })()}

            {showClearConfirm && (
                <div className="absolute inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-gray-100 max-w-xs text-center animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <h3 className="text-xl font-black mb-2 text-gray-900">Clear Page?</h3>
                        <p className="text-sm text-gray-500 mb-8 leading-relaxed">This will permanently delete all strokes on your current page.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={confirmClear} className="w-full py-4 rounded-2xl bg-red-500 text-white font-black hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-200">DELETE EVERYTHING</button>
                            <button onClick={() => setShowClearConfirm(false)} className="w-full py-4 rounded-2xl bg-gray-50 text-gray-600 font-bold hover:bg-gray-100 transition-all">STAY HERE</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DigitalCanvas;
