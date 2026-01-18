import React from 'react';

interface CanvasZoomControlsProps {
    scale: number;
    onReset: () => void;
}

export const CanvasZoomControls: React.FC<CanvasZoomControlsProps> = ({ scale, onReset }) => {
    return (
        <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-[60]">
            <span>{Math.round(scale * 100)}%</span>
            <button
                onClick={onReset}
                className="px-1 py-0.5 rounded bg-white/10 hover:bg-white/20"
            >
                Reset
            </button>
        </div>
    );
};
