import React from 'react';
import { Pen, Eraser, RotateCcw, RotateCw, Trash2, Save, Grid, Circle, Ruler, Plus, ChevronLeft, ChevronRight, Hand } from 'lucide-react';
import { BgStyle } from '@/types/canvas';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CanvasToolbarProps {
    tool: 'pen' | 'eraser' | 'ruler' | 'hand';
    setTool: (t: 'pen' | 'eraser' | 'ruler' | 'hand') => void;
    color: string;
    setColor: (c: string) => void;
    brushRadius: number;
    setBrushRadius: (r: number) => void;
    eraserRadius: number;
    setEraserRadius: (r: number) => void;
    bgStyle: BgStyle;
    setBgStyle: (s: BgStyle) => void;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    onSave: () => void;

    // Page Management Props
    currentPage: number;
    totalPages: number;
    onAddPage: () => void;
    onSwitchPage: (index: number) => void;
    onDeletePage: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
    tool, setTool,
    color, setColor,
    brushRadius, setBrushRadius,
    eraserRadius, setEraserRadius,
    bgStyle, setBgStyle,
    onUndo, onRedo, onClear, onSave,
    currentPage, totalPages, onAddPage, onSwitchPage, onDeletePage
}) => {
    const isEraseMode = tool === 'eraser';
    const isRulerMode = tool === 'ruler';

    // Ruler and Pen share the brushRadius. Eraser has its own.
    const currentSize = isEraseMode ? eraserRadius : brushRadius;
    const sizeLabel = isEraseMode ? 'Eraser Size' : (isRulerMode ? 'Ruler Size' : 'Brush Size');

    return (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-3 px-2 py-4 bg-white/80 backdrop-blur-md rounded-3xl shadow-premium border border-white/40 animate-in fade-in slide-in-from-left-4 duration-500 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-none">
            {/* Main Tools Group */}
            <div className="flex flex-col items-center bg-gray-100/50 rounded-2xl p-1 gap-1 w-full flex-shrink-0">
                <ToolIcon
                    icon={<Pen className="h-4 w-4" />}
                    active={tool === 'pen'}
                    onClick={() => setTool('pen')}
                    label="Pen (P)"
                />
                <ToolIcon
                    icon={<Hand className="h-4 w-4" />}
                    active={tool === 'hand'}
                    onClick={() => setTool('hand')}
                    label="Pan (H)"
                />
                <ToolIcon
                    icon={<Ruler className="h-4 w-4" />}
                    active={tool === 'ruler'}
                    onClick={() => setTool('ruler')}
                    label="Ruler (R)"
                />
                <ToolIcon
                    icon={<Eraser className="h-4 w-4" />}
                    active={tool === 'eraser'}
                    onClick={() => setTool('eraser')}
                    label="Eraser (E)"
                />
            </div>

            <div className="w-8 h-px bg-gray-200/60 my-1 shrink-0" />

            {/* Properties Group */}
            <div className="flex flex-col items-center gap-2 w-full flex-shrink-0">
                {/* Color Picker */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            className="group p-3 rounded-2xl transition-all duration-200 hover:bg-gray-100 active:scale-90 relative outline-none"
                            title="Color"
                        >
                            <div
                                className="h-5 w-5 rounded-full border border-gray-200 shadow-sm transition-transform group-hover:scale-110"
                                style={{ backgroundColor: color }}
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-white border border-gray-100" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="center" className="min-w-[180px] p-4 rounded-2xl shadow-xl ml-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Choose Color</p>
                        <div className="grid grid-cols-4 gap-2">
                            {['#000000', '#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "h-8 w-8 rounded-xl border-2 border-transparent transition-all hover:scale-110 active:scale-90 shadow-sm",
                                        color === c && "border-primary scale-110 ring-2 ring-primary/20"
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Size Picker */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="p-3 rounded-2xl transition-all duration-200 flex items-center justify-center relative group hover:bg-gray-100/80 hover:text-gray-600 active:scale-95 text-gray-400 outline-none">
                            <Circle className="h-4 w-4 fill-current" />
                            <Tooltip label="Size" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="center" className="min-w-[220px] p-5 rounded-2xl shadow-xl ml-2">
                        <div className="flex justify-between items-center mb-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{sizeLabel}</p>
                            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                {currentSize}px
                            </span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max={isEraseMode ? "100" : "50"}
                            value={currentSize}
                            onChange={(e) => isEraseMode ? setEraserRadius(parseInt(e.target.value)) : setBrushRadius(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </PopoverContent>
                </Popover>

                {/* Background Grid */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="p-3 rounded-2xl transition-all duration-200 flex items-center justify-center relative group hover:bg-gray-100/80 hover:text-gray-600 active:scale-95 text-gray-400 outline-none">
                            <Grid className="h-4 w-4" />
                            <Tooltip label="Grid" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="center" className="min-w-[150px] p-2 rounded-2xl shadow-xl ml-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2">Paper Type</p>
                        <div className="flex flex-col gap-1">
                            {[
                                { id: 'plain', label: 'Plain' },
                                { id: 'dots', label: 'Dots' },
                                { id: 'lines', label: 'Ruled' },
                                { id: 'grid', label: 'Grid' }
                            ].map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => setBgStyle(style.id as BgStyle)}
                                    className={cn(
                                        "flex items-center px-3 py-2 rounded-xl text-xs font-bold transition-colors text-left",
                                        bgStyle === style.id ? "bg-primary/10 text-primary" : "hover:bg-gray-100 text-gray-600"
                                    )}
                                >
                                    {style.label}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="w-8 h-px bg-gray-200/60 my-1 shrink-0" />

            {/* Page Management Group */}
            <div className="flex flex-col items-center bg-indigo-50/50 rounded-2xl p-1 gap-1 w-full flex-shrink-0">
                <div className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold text-indigo-600 border-b border-indigo-100/50 w-full">
                    <span className="opacity-50">PG</span>
                    <span className="text-sm font-black tracking-tighter">{currentPage + 1}/{totalPages}</span>
                </div>

                <button
                    onClick={() => onSwitchPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="p-2 rounded-xl hover:bg-white disabled:opacity-20 disabled:hover:bg-transparent transition-all outline-none"
                    title="Previous Page"
                >
                    <ChevronLeft className="h-4 w-4 text-indigo-500 -rotate-90" />
                </button>
                <button
                    onClick={() => onSwitchPage(currentPage + 1)}
                    disabled={currentPage === totalPages - 1}
                    className="p-2 rounded-xl hover:bg-white disabled:opacity-20 disabled:hover:bg-transparent transition-all outline-none"
                    title="Next Page"
                >
                    <ChevronRight className="h-4 w-4 text-indigo-500 -rotate-90" />
                </button>

                <button
                    onClick={onAddPage}
                    className="p-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-all active:scale-90 shadow-sm outline-none"
                    title="Add Page"
                >
                    <Plus className="h-4 w-4" />
                </button>
                {totalPages > 1 && (
                    <button
                        onClick={onDeletePage}
                        className="p-2 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90 outline-none"
                        title="Delete Page"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="w-8 h-px bg-gray-200/60 my-1 shrink-0" />

            {/* History Actions */}
            <div className="flex flex-col items-center gap-1 w-full flex-shrink-0">
                <ToolIcon icon={<RotateCcw className="h-4 w-4" />} onClick={onUndo} label="Undo" />
                <ToolIcon icon={<RotateCw className="h-4 w-4" />} onClick={onRedo} label="Redo" />
                <ToolIcon icon={<Trash2 className="h-4 w-4 text-red-500/70 hover:text-red-500" />} onClick={onClear} label="Clear Canvas" />
            </div>

            <div className="w-8 h-px bg-gray-200/60 my-1 shrink-0" />

            <ToolIcon icon={<Save className="h-4 w-4 text-primary" />} onClick={onSave} label="Save as PNG" />
        </div>
    );
};

const ToolIcon = ({ icon, active, onClick, label }: {
    icon: React.ReactNode;
    active?: boolean;
    onClick?: () => void;
    label?: string;
}) => (
    <button
        onClick={onClick}
        className={cn(
            "p-3 rounded-2xl transition-all duration-200 flex items-center justify-center relative group outline-none",
            active ? "bg-white shadow-soft text-primary scale-110" : "text-gray-400 hover:bg-gray-100/80 hover:text-gray-600 active:scale-95"
        )}
        title={label}
    >
        {icon}
        {label && <Tooltip label={label} />}
    </button>
);

const Tooltip = ({ label }: { label: string }) => (
    <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900/95 text-[10px] text-white font-black tracking-widest uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-white/10 scale-95 group-hover:scale-100">
        {label}
    </div>
);
