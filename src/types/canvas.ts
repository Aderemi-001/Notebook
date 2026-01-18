export interface Point {
    x: number;
    y: number;
    t: number;
    p: number; // pressure (0-1)
}

export interface Stroke {
    color: string;
    baseWidth: number;
    points: Point[];
    isEraser?: boolean;
    pointerType?: 'pen' | 'mouse' | 'touch';
    shapeType?: 'freehand' | 'line' | 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'arrow';
}

export type BgStyle = 'plain' | 'dots' | 'lines' | 'grid';

export interface Page {
    id: string;
    strokes: Stroke[];
}

export interface Drawing {
    pages: Page[];
    currentPageIndex: number;
    background?: BgStyle;
    version: number;
}


