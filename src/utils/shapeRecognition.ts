import { Point, Stroke } from '@/types/canvas';

export type ShapeKind =
    | 'line'
    | 'rectangle'
    | 'circle'
    | 'ellipse'
    | 'triangle'
    | 'arrow';

// ---------- helpers ----------

const getBounds = (pts: Point[]) => {
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
};



// detect “corner strength” along stroke
// Finds points where the internal angle is SHARPER (smaller) than maxAngleDeg.
// e.g. Straight line is 180. 90 degree turn is 90.
const findCornerIndices = (pts: Point[], maxAngleDeg = 100) => {
    const corners: number[] = [];
    // cos(angle)
    // angle < max => cos(angle) > cos(max) (for 0..180 range)
    const minCos = Math.cos((maxAngleDeg * Math.PI) / 180);

    for (let i = 1; i < pts.length - 1; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const c = pts[i + 1];

        const v1x = a.x - b.x;
        const v1y = a.y - b.y;
        const v2x = c.x - b.x;
        const v2y = c.y - b.y;
        const dot = v1x * v2x + v1y * v2y;
        const len1 = Math.hypot(v1x, v1y) || 1;
        const len2 = Math.hypot(v2x, v2y) || 1;
        const cos = dot / (len1 * len2);

        // We want sharp corners (large cos)
        if (cos > minCos) {
            corners.push(i);
        }
    }
    return corners;
};

// ---------- individual detectors ----------

export function detectStraightLine(
    stroke: Stroke,
    tolerance = 0.03
): Stroke | null {
    const pts = stroke.points;
    if (pts.length < 3) return null;

    const first = pts[0];
    const last = pts[pts.length - 1];

    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const len = Math.hypot(dx, dy);
    if (len < 20) return null;

    const a = dy;
    const b = -dx;
    const c = dx * first.y - dy * first.x;

    let maxDist = 0;
    for (let i = 1; i < pts.length - 1; i++) {
        const p = pts[i];
        const dist = Math.abs(a * p.x + b * p.y + c) / len;
        if (dist > maxDist) maxDist = dist;
    }
    if (maxDist / len > tolerance) return null;

    const midT = (first.t + last.t) / 2;
    const midP = ((first.p ?? 0.5) + (last.p ?? 0.5)) / 2;

    return {
        ...stroke,
        shapeType: 'line',
        points: [
            { x: first.x, y: first.y, t: first.t, p: first.p },
            { x: last.x, y: last.y, t: midT, p: midP },
        ],
    };
}

// Circle / ellipse family
export function detectCircleOrEllipse(
    stroke: Stroke,
    tolerance = 0.08
): { kind: 'circle' | 'ellipse'; stroke: Stroke } | null {
    const pts = stroke.points;
    if (pts.length < 20) return null; // need lots of points for a circle

    const { minX, maxX, minY, maxY, width, height } = getBounds(pts);
    if (width < 30 || height < 30) return null;

    // Check if shape is closed (first and last point nearby)
    const first = pts[0];
    const last = pts[pts.length - 1];
    // Allow a bit more gap for quick sketches, but must be relatively closed
    const closureDist = Math.hypot(last.x - first.x, last.y - first.y);
    if (closureDist > Math.max(width, height) * 0.3) return null;

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const rx = width / 2;
    const ry = height / 2;
    const avgR = (rx + ry) / 2;

    // Check radial distribution: points should cover multiple angles
    const angleMap = new Map<number, number>();
    let maxRelError = 0;

    for (const p of pts) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const angle = Math.atan2(dy, dx);
        const bucket = Math.floor((angle + Math.PI) / (Math.PI / 8)); // 16 buckets
        angleMap.set(bucket, (angleMap.get(bucket) ?? 0) + 1);

        // ellipse distance check
        const angleRad = Math.atan2(dy, dx);
        const ex = cx + rx * Math.cos(angleRad);
        const ey = cy + ry * Math.sin(angleRad);
        const dist = Math.hypot(p.x - ex, p.y - ey);
        const rel = dist / avgR;
        if (rel > maxRelError) maxRelError = rel;
    }

    // must have points in at least 10 of 16 angular buckets (approx 60% coverage)
    if (angleMap.size < 10) return null;

    // radial error must be small
    if (maxRelError > tolerance) return null;

    const segments = 40;
    const now = performance.now();
    const shapePts: Point[] = [];
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * 2 * Math.PI;
        shapePts.push({
            x: cx + rx * Math.cos(t),
            y: cy + ry * Math.sin(t),
            t: now,
            p: 0.5,
        });
    }

    const aspect = width / height;
    const kind =
        aspect > 0.85 && aspect < 1.15 ? ('circle' as const) : ('ellipse' as const);

    return {
        kind,
        stroke: {
            ...stroke,
            shapeType: kind,
            points: shapePts,
        },
    };
}

export function detectRectangle(
    stroke: Stroke,
    tolerance = 0.10
): Stroke | null {
    const pts = stroke.points;
    if (pts.length < 16) return null; // need dense points

    const { minX, maxX, minY, maxY, width, height } = getBounds(pts);

    // reject skewed shapes
    const aspect = width / height;
    if (aspect < 0.5 || aspect > 2) return null;

    if (width < 40 || height < 40) return null; // larger minimum

    const diag = Math.hypot(width, height);
    const maxDist = diag * tolerance;

    // check for 4 CORNERS: points near the 4 corners of the bbox
    const corners = {
        topLeft: { x: minX, y: minY, found: false },
        topRight: { x: maxX, y: minY, found: false },
        bottomRight: { x: maxX, y: maxY, found: false },
        bottomLeft: { x: minX, y: maxY, found: false },
    };

    const cornerRadius = Math.min(width, height) * 0.15; // within 15% of size

    for (const p of pts) {
        // check distance to each corner
        if (
            Math.hypot(p.x - minX, p.y - minY) < cornerRadius
        ) corners.topLeft.found = true;
        if (
            Math.hypot(p.x - maxX, p.y - minY) < cornerRadius
        ) corners.topRight.found = true;
        if (
            Math.hypot(p.x - maxX, p.y - maxY) < cornerRadius
        ) corners.bottomRight.found = true;
        if (
            Math.hypot(p.x - minX, p.y - maxY) < cornerRadius
        ) corners.bottomLeft.found = true;
    }

    const cornersFound = Object.values(corners).filter(c => c.found).length;
    if (cornersFound < 3) return null; // need at least 3 corners

    // count points ON the sides (not just in bbox)
    let onSideCount = 0;
    for (const p of pts) {
        const onTop = Math.abs(p.y - minY) < maxDist && p.x >= minX - maxDist && p.x <= maxX + maxDist;
        const onBottom = Math.abs(p.y - maxY) < maxDist && p.x >= minX - maxDist && p.x <= maxX + maxDist;
        const onLeft = Math.abs(p.x - minX) < maxDist && p.y >= minY - maxDist && p.y <= maxY + maxDist;
        const onRight = Math.abs(p.x - maxX) < maxDist && p.y >= minY - maxDist && p.y <= maxY + maxDist;

        if (onTop || onBottom || onLeft || onRight) onSideCount++;
    }

    // at least 75% of points must be on the sides
    if (onSideCount / pts.length < 0.75) return null;

    const now = performance.now();
    const rectPts: Point[] = [
        { x: minX, y: minY, t: now, p: 0.5 },
        { x: maxX, y: minY, t: now, p: 0.5 },
        { x: maxX, y: maxY, t: now, p: 0.5 },
        { x: minX, y: maxY, t: now, p: 0.5 },
        { x: minX, y: minY, t: now, p: 0.5 },
    ];

    return {
        ...stroke,
        shapeType: 'rectangle',
        points: rectPts,
    };
}

// Triangle via 3 strongest corners
export function detectTriangle(
    stroke: Stroke,
    angleDeg = 100
): Stroke | null {
    const pts = stroke.points;
    if (pts.length < 10) return null;

    // 1. Check Closure
    const first = pts[0];
    const last = pts[pts.length - 1];
    const { width, height } = getBounds(pts);
    const diag = Math.hypot(width, height);
    if (Math.hypot(first.x - last.x, first.y - last.y) > diag * 0.3) return null; // Must be closed

    // 2. Find Corners
    const cornerIdx = findCornerIndices(pts, angleDeg);

    // Filter to unique corners by distance
    const uniqueCorners: Point[] = [];
    const minCornerDist = diag * 0.15;

    for (const idx of cornerIdx) {
        const p = pts[idx];
        const isDuplicate = uniqueCorners.some(existing => Math.hypot(existing.x - p.x, existing.y - p.y) < minCornerDist);
        if (!isDuplicate) uniqueCorners.push(p);
    }

    // Must have exactly 3 unique corners
    if (uniqueCorners.length !== 3) return null;

    const v1 = uniqueCorners[0];
    const v2 = uniqueCorners[1];
    const v3 = uniqueCorners[2];

    // 3. Check Side Adherence
    // Line segments: v1-v2, v2-v3, v3-v1
    const segments = [[v1, v2], [v2, v3], [v3, v1]];
    const maxDist = diag * 0.10; // 10% tolerance

    let onSideCount = 0;
    for (const p of pts) {
        let minDistToAny = Infinity;
        for (const [a, b] of segments) {
            const d = distanceToSegment(p, a, b);
            if (d < minDistToAny) minDistToAny = d;
        }
        if (minDistToAny < maxDist) onSideCount++;
    }

    if (onSideCount / pts.length < 0.75) return null;

    // build triangle stroke
    const now = performance.now();
    const triPts: Point[] = [
        { ...v1, t: now },
        { ...v2, t: now },
        { ...v3, t: now },
        { ...v1, t: now },
    ];

    return {
        ...stroke,
        shapeType: 'triangle',
        points: triPts,
    };
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
    const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

// Arrow: long line with short V at one end
export function detectArrow(stroke: Stroke): Stroke | null {
    const pts = stroke.points;
    if (pts.length < 6) return null;

    const first = pts[0];
    const last = pts[pts.length - 1];

    const lineCandidate = detectStraightLine(stroke, 0.06);
    if (!lineCandidate) return null;

    // check for small “head” near last point: a sharp angle (e.g. < 60 deg)
    const cornerIdx = findCornerIndices(pts, 60);
    if (!cornerIdx.length) return null;

    // const headIndex = cornerIdx[cornerIdx.length - 1]; // unused
    // const head = pts[headIndex]; // unused

    // vector main line
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const len = Math.hypot(dx, dy);
    if (len < 30) return null;

    const ux = dx / len;
    const uy = dy / len;

    const headLen = Math.min(20, len / 4);

    const leftAngle = (150 * Math.PI) / 180;
    const rightAngle = (-150 * Math.PI) / 180;

    const lx = last.x + headLen * (ux * Math.cos(leftAngle) - uy * Math.sin(leftAngle));
    const ly = last.y + headLen * (ux * Math.sin(leftAngle) + uy * Math.cos(leftAngle));

    const rx = last.x + headLen * (ux * Math.cos(rightAngle) - uy * Math.sin(rightAngle));
    const ry = last.y + headLen * (ux * Math.sin(rightAngle) + uy * Math.cos(rightAngle));

    const now = performance.now();
    const arrowPts: Point[] = [
        { x: first.x, y: first.y, t: now, p: 0.5 },
        { x: last.x, y: last.y, t: now, p: 0.5 },
        { x: lx, y: ly, t: now, p: 0.5 },
        { x: last.x, y: last.y, t: now, p: 0.5 },
        { x: rx, y: ry, t: now, p: 0.5 },
    ];

    return {
        ...stroke,
        shapeType: 'arrow',
        points: arrowPts,
    };
}

// ---------- main dispatcher ----------

export function detectShape(
    stroke: Stroke
): { kind: ShapeKind; replacement: Stroke } | null {
    // ignore very small strokes
    const { width, height } = getBounds(stroke.points);
    if (Math.max(width, height) < 20) return null;

    // 1) arrow (more specific)
    const arrow = detectArrow(stroke);
    if (arrow) return { kind: 'arrow', replacement: arrow };

    // 2) line
    const line = detectStraightLine(stroke);
    if (line) return { kind: 'line', replacement: line };

    // 3) rectangle
    const rect = detectRectangle(stroke);
    if (rect) return { kind: 'rectangle', replacement: rect };

    // 4) circle / ellipse
    const ce = detectCircleOrEllipse(stroke);
    if (ce) return { kind: ce.kind, replacement: ce.stroke };

    // 5) triangle
    const tri = detectTriangle(stroke);
    if (tri) return { kind: 'triangle', replacement: tri };

    return null;
}
