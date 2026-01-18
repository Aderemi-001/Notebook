import { Point, Drawing } from '../types/canvas';

// Simple smoothing (Chaikin's algorithm variant / averaging)
export const smoothPoints = (pts: Point[]): Point[] => {
    if (pts.length < 3) return pts;
    const out: Point[] = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        out.push({
            x: (p0.x + p1.x + p2.x) / 3,
            y: (p0.y + p1.y + p2.y) / 3,
            t: p1.t,
            p: p1.p,
        });
    }
    out.push(pts[pts.length - 1]);
    return out;
};

export const getTouchInfo = (touches: React.TouchList, rect: DOMRect) => {
    const t1 = touches[0];
    const t2 = touches[1];
    const x1 = t1.clientX - rect.left;
    const y1 = t1.clientY - rect.top;
    const x2 = t2.clientX - rect.left;
    const y2 = t2.clientY - rect.top;

    const center = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    const dist = Math.hypot(x2 - x1, y2 - y1);
    return { center, dist };
};

export const compressDrawing = (d: Drawing): Drawing => ({
    ...d,
    pages: d.pages.map(page => ({
        ...page,
        strokes: page.strokes.map(s => ({
            ...s,
            points: s.points.map(p => ({
                x: Math.round(p.x * 10) / 10,
                y: Math.round(p.y * 10) / 10,
                t: p.t,
                p: p.p,
            })),
        })),
    })),
});

export const getPointerWorldPos = (
    clientX: number,
    clientY: number,
    rect: DOMRect,
    scale: number,
    offset: { x: number; y: number }
) => {
    const xScreen = clientX - rect.left;
    const yScreen = clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    return {
        x: (xScreen - cx) / scale + cx - offset.x,
        y: (yScreen - cy) / scale + cy - offset.y,
    };
};



export const createDotsPattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 24;
    patternCanvas.height = 24;
    const pCtx = patternCanvas.getContext('2d');
    if (!pCtx) return null;

    pCtx.fillStyle = '#cbd5e1'; // slate-300
    pCtx.beginPath();
    pCtx.arc(2, 2, 1, 0, Math.PI * 2);
    pCtx.fill();

    return ctx.createPattern(patternCanvas, 'repeat');
};
