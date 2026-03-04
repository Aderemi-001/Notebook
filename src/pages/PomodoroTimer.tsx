import React, { useState, useRef, useEffect } from 'react';
import FlipClockCountdown from '@leenguyen/react-flip-clock-countdown';
import '@leenguyen/react-flip-clock-countdown/dist/index.css';
import '@/styles/flip-clock.css';
import '@/styles/pomodoro-timer.css';
import { Maximize, Minimize, Settings as SettingsIcon, X, Lock } from 'lucide-react';
import { toast } from "sonner";

import { usePomodoro } from '@/contexts/PomodoroContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useLanguage } from '@/contexts/LanguageContext';

// --- Helper Component for Inputs ---
const DurationInput: React.FC<{
    value: number;
    onChange: (val: number) => void;
    label: string;
}> = ({ value, onChange, label }) => {
    const [localValue, setLocalValue] = useState(value.toString());

    useEffect(() => {
        setLocalValue(value.toString());
    }, [value]);

    const handleBlur = () => {
        let parsed = parseInt(localValue);
        if (isNaN(parsed) || parsed < 1) parsed = 1;
        if (parsed > 60) parsed = 60;
        onChange(parsed);
        setLocalValue(parsed.toString());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col items-center hover:bg-white/10 transition group">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onChange(value - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white transition"
                >
                    -
                </button>
                <input
                    type="number"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="w-14 bg-transparent text-center text-2xl font-mono font-bold text-white outline-none border-none appearance-none"
                    style={{ MozAppearance: 'textfield' }}
                />
                <button
                    onClick={() => onChange(value + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white transition"
                >
                    +
                </button>
            </div>
            <span className="text-[9px] text-gray-600 mt-0.5">{label === 'Focus' || label === 'Break' ? (label === 'Focus' ? 'minutes' : 'minutes') : 'minutes'}</span> {/* Simplified: label is localized in parent, unit can be too if needed */}
        </div>
    );
};

const PomodoroTimer: React.FC = () => {
    const [scale, setScale] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const { t } = useLanguage();

    // UI Local State
    const [isEditingTask, setIsEditingTask] = useState(false);

    // Context Hooks
    const {
        targetTime, isRunning, isBreak,
        workTime, breakTime, soundEnabled, tickingEnabled, theme, focusTask, completedSessions,
        setSoundEnabled, setTickingEnabled, setTheme, setFocusTask,
        startTimer, pauseTimer, resetTimer, handleComplete, toggleMode, updateWorkTime, updateBreakTime,
        remainingTimeRef
    } = usePomodoro();

    // Subscription
    const { isPremium } = useSubscription();

    const clockRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleShortcut = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (isRunning) pauseTimer();
                    else startTimer();
                    break;
                case 'KeyR':
                    resetTimer();
                    break;
                case 'KeyM':
                    setSoundEnabled(!soundEnabled);
                    break;
                case 'Escape':
                    if (isFullscreen) toggleFullscreen();
                    break;
            }
        };

        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [isRunning, soundEnabled, isFullscreen]); // Added isFullscreen to deps

    // --- Scaling Logic ---
    useEffect(() => {
        const handleResize = () => {
            const clockBaseWidth = 360;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const reservedHeight = 350;
            const availableWidth = viewportWidth * 0.85;
            const availableHeight = Math.max(viewportHeight - reservedHeight, 200);

            const scaleW = availableWidth / clockBaseWidth;
            const scaleH = availableHeight / 150;

            const newScale = Math.min(Math.max(Math.min(scaleW, scaleH), 0.5), 4.5);
            setScale(newScale);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleTick = () => {
        // We let the context handle the title update and tick logic, 
        // but FlipClock needs a tick handler to potentially sync? 
        // We might just update the ref here for redundancy or remove logic.
        // Let's keep it minimal.
    };

    const toggleFullscreen = async () => {
        const elem = rootRef.current as any;
        const doc = document as any;

        // Check if we are specifically in a "pseudo-fullscreen" or actual native fullscreen
        const isNativeFullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);

        // If we're already in any form of fullscreen, we want to exit
        if (isNativeFullscreen || isFullscreen) {
            try {
                if (doc.exitFullscreen) await doc.exitFullscreen();
                else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
                else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
                else if (doc.msExitFullscreen) await doc.msExitFullscreen();
            } catch (err) {
                console.warn("Fullscreen exit failed", err);
            }
            setIsFullscreen(false);
        } else {
            // Try native first
            try {
                if (elem.requestFullscreen) await elem.requestFullscreen();
                else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
                else if (elem.mozRequestFullScreen) await elem.mozRequestFullScreen();
                else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
                else {
                    // Fallback for browsers like iOS Safari that don't support fullscreen API on div elements
                    setIsFullscreen(true);
                }
            } catch (err) {
                console.warn("Native fullscreen request failed, falling back to CSS mode", err);
                setIsFullscreen(true);
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            const doc = document as any;
            const isNative = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
            setIsFullscreen(isNative);
        };

        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        events.forEach(evt => document.addEventListener(evt, handleFullscreenChange));

        return () => {
            events.forEach(evt => document.removeEventListener(evt, handleFullscreenChange));
        };
    }, []);

    // --- Clean Input Handlers ---
    // (Removed, using context functions directly)

    return (
        <div
            className={`pomo-root theme-${theme} ${isFullscreen ? 'pomo-fullscreen' : 'pomo-windowed'}`}
            ref={rootRef}
        >

            {/* Tools (Top Right) */}
            <div className="pomo-tools">
                <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
                    <SettingsIcon size={20} />
                </button>
                <button className="icon-btn" onClick={toggleFullscreen} title="Fullscreen">
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
            </div>

            {/* Label & Intent */}
            <div className="flex flex-col items-center z-10 mb-8 select-none">
                <div
                    className="pomo-label text-4xl md:text-6xl font-black tracking-widest text-white/90 hover:text-white transition-colors cursor-pointer mb-2"
                    onClick={toggleMode}
                    title="Click to switch mode"
                >
                    {isBreak ? t('study.shortBreak') : t('study.focusTime')}
                </div>

                {/* Minimalist Focus Task Subtitle */}
                <div className="h-8 flex items-center justify-center">
                    {isEditingTask ? (
                        <input
                            autoFocus
                            onBlur={() => setIsEditingTask(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingTask(false)}
                            onChange={(e) => setFocusTask(e.target.value)}
                            value={focusTask}
                            placeholder="What is your focus?"
                            className="bg-transparent text-center text-white/70 text-lg font-light outline-none placeholder-white/20 w-64 border-b border-white/10"
                        />
                    ) : (
                        <button
                            onClick={() => setIsEditingTask(true)}
                            className={`text-lg font-light transition-all duration-300 ${focusTask ? 'text-white/60 hover:text-white' : 'text-white/20 hover:text-white/40'}`}
                        >
                            {focusTask || (isBreak ? t('study.relax') || "Relax & Recharge" : t('study.clickToSetFocus') || "Click to set focus...")}
                        </button>
                    )}
                </div>
            </div>

            {/* Clock */}
            <div
                className="pomo-clock-container"
                ref={clockRef}
                style={{ transform: `scale(${scale})` }}
            >
                <FlipClockCountdown
                    to={isRunning ? targetTime : Date.now() + remainingTimeRef.current}
                    key={isRunning ? 'running' : 'paused-' + remainingTimeRef.current}
                    className="flip-clock"
                    showLabels={false}
                    showSeparators={true}
                    labels={[t('time.days') || 'Days', t('time.hours') || 'Hours', t('time.minutes') || 'Minutes', t('time.seconds') || 'Seconds']}
                    duration={0.6}
                    onComplete={handleComplete}
                    onTick={handleTick}
                    renderMap={[false, false, true, true]}
                />
            </div>

            {/* Controls */}
            <div className="pomo-controls-container flex flex-col items-center gap-6">
                <div className="pomo-controls">
                    {!isRunning ? (
                        <button onClick={startTimer} title="Space">
                            {remainingTimeRef.current === (isBreak ? breakTime : workTime) * 60 * 1000 ? t('study.start') : t('study.resume')}
                        </button>
                    ) : (
                        <button onClick={pauseTimer} title="Space">{t('study.pause')}</button>
                    )}
                    <button onClick={resetTimer} title="Press 'R'">{t('study.reset')}</button>
                </div>

                {/* Session Counter */}
                <div className="pomo-sessions flex items-center gap-2 opacity-80" title="Sessions Completed">
                    <span className="text-xs font-mono uppercase tracking-widest text-white/50">{t('study.sessions') || 'Sessions'}</span>
                    <div className="flex gap-1">
                        {Array.from({ length: Math.min(completedSessions + 1, 8) }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${i < completedSessions ? 'bg-white' : 'bg-white/20'}`}
                            />
                        ))}
                        {completedSessions >= 8 && <span className="text-xs text-white/50 ml-1">+{completedSessions - 8}</span>}
                    </div>
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
                    <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-white/10 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white">{t('study.timerSettings') || 'Timer Settings'}</h2>
                            <button onClick={() => setShowSettings(false)} className="text-white/50 hover:text-white transition">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Theme Selector */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-gray-400 block">{t('settings.theme') || 'Theme'}</label>
                                    {!isPremium && <span className="text-[10px] text-purple-400 font-medium">{t('study.upgradeForMore') || 'Upgrade for more'}</span>}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {['midnight', 'sunset', 'forest', 'ocean'].map(t => {
                                        const isLocked = !isPremium && t !== 'midnight';
                                        return (
                                            <button
                                                key={t}
                                                onClick={() => {
                                                    if (isLocked) {
                                                        toast.error("Upgrade to Pro to unlock themes!", {
                                                            description: "Get access to Sunset, Forest, and Ocean themes."
                                                        });
                                                        return;
                                                    }
                                                    setTheme(t);
                                                }}
                                                className={`p-1.5 rounded text-[10px] uppercase font-medium tracking-wider border flex items-center justify-center gap-2 relative transition-all ${theme === t ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-white/10 text-gray-500 hover:bg-white/5'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            >
                                                {t}
                                                {isLocked && <Lock size={8} className="text-white/40" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Duration Settings (Hybrid Card Style) */}
                            <div className="grid grid-cols-1 gap-3">
                                <DurationInput
                                    label={t('study.focus') || "Focus"}
                                    value={workTime}
                                    onChange={updateWorkTime}
                                />
                                <DurationInput
                                    label={t('study.break') || "Break"}
                                    value={breakTime}
                                    onChange={updateBreakTime}
                                />
                            </div>

                            {/* Sound Toggle */}
                            <div className="flex flex-col gap-3 mt-3 border-t border-white/10 pt-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-400">{t('study.soundEffects') || 'Sound Effects'}</span>
                                    <button
                                        onClick={() => setSoundEnabled(!soundEnabled)}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${soundEnabled ? 'bg-purple-500' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${soundEnabled ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">{t('study.tickingSound') || 'Ticking Sound'}</span>
                                        {!isPremium && <Lock size={10} className="text-purple-400" />}
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (!isPremium) {
                                                toast.error("Upgrade to Pro to enable Ticking Sound!", {
                                                    description: "Immersive audio is a Pro feature."
                                                });
                                                return;
                                            }
                                            setTickingEnabled(!tickingEnabled);
                                        }}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${tickingEnabled ? 'bg-purple-500' : 'bg-gray-700'} ${!soundEnabled ? 'opacity-50' : ''}`}
                                        disabled={!soundEnabled}
                                        style={{ opacity: soundEnabled ? 1 : 0.5, cursor: soundEnabled ? 'pointer' : 'not-allowed' }}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${tickingEnabled ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/10 text-center">
                            <p className="text-[10px] text-gray-600">Changes auto-save</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PomodoroTimer;
