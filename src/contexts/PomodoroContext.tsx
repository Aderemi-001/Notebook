
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    showTimerNotification,
    vibrateDevice,
    updateBadge,
    clearBadge,
    requestWakeLock,
    releaseWakeLock
} from '@/utils/notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from "sonner";

const DEFAULT_WORK = 25;
const DEFAULT_BREAK = 5;
const DEFAULT_LONG_BREAK = 15;

// --- Sound Logic ---
// Helper to unlock audio on iOS/Safari
let sharedAudioCtx: AudioContext | null = null;

const unlockAudioContext = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        if (!sharedAudioCtx) {
            sharedAudioCtx = new AudioContext();
        }

        const ctx = sharedAudioCtx;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        // Play a silent buffer to fully unlock
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } catch (e) {
        console.error("Audio unlock failed", e);
    }
};

const playNotification = (type: 'start' | 'pause' | 'reset' | 'complete' | 'tick' = 'complete') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        // Initialize or reuse shared context
        if (!sharedAudioCtx) {
            sharedAudioCtx = new AudioContext();
        }

        const ctx = sharedAudioCtx;

        // Try to resume if suspended (requires user gesture usually, but good to attempt)
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => { });
        }

        // Ticking optimization: only recreate oscillator/gain, strict timing
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const now = ctx.currentTime;

        switch (type) {
            case 'tick':
                // Short, crisp mechanical click
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(1000, now);
                oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.05);

                // Very short envelope
                gainNode.gain.setValueAtTime(0.05, now); // Quiet tick
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

                oscillator.start(now);
                oscillator.stop(now + 0.05);
                break;
            case 'start':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, now); // A4
                oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                oscillator.start(now);
                oscillator.stop(now + 0.1);
                break;
            case 'pause':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, now);
                oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.1);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                oscillator.start(now);
                oscillator.stop(now + 0.1);
                break;
            case 'reset':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(600, now);
                oscillator.frequency.linearRampToValueAtTime(100, now + 0.2);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.linearRampToValueAtTime(0.001, now + 0.2);
                oscillator.start(now);
                oscillator.stop(now + 0.2);
                break;
            case 'complete':
            default:
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, now);
                oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
                oscillator.start(now);
                oscillator.stop(now + 1.5);
                break;
        }
    } catch (e) {
        console.error("Audio play failed", e);
    }
};

interface PomodoroContextType {
    targetTime: number;
    isRunning: boolean;
    isBreak: boolean;
    isLongBreak: boolean;
    workTime: number;
    breakTime: number;
    longBreakTime: number;
    soundEnabled: boolean;
    tickingEnabled: boolean;
    autoStart: boolean;
    theme: string;
    focusTask: string;
    completedSessions: number;

    setWorkTime: (n: number) => void;
    setBreakTime: (n: number) => void;
    setLongBreakTime: (n: number) => void;
    setSoundEnabled: (b: boolean) => void;
    setTickingEnabled: (b: boolean) => void;
    setAutoStart: (b: boolean) => void;
    setTheme: (s: string) => void;
    setFocusTask: (s: string) => void;
    setCompletedSessions: (n: number | ((prev: number) => number)) => void;

    startTimer: () => void;
    pauseTimer: () => void;
    resetTimer: () => void;
    handleComplete: () => void;
    toggleMode: () => void;
    updateWorkTime: (val: number) => void;
    updateBreakTime: (val: number) => void;
    updateLongBreakTime: (val: number) => void;

    remainingTimeRef: React.MutableRefObject<number>;
}

// --- Worker Script ---
const timerWorkerScript = `
    let intervalId;
    self.onmessage = function(e) {
        if (e.data === 'start') {
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(() => self.postMessage('tick'), 1000);
        } else if (e.data === 'stop') {
            if (intervalId) clearInterval(intervalId);
        }
    };
`;

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();

    // --- State ---
    const [targetTime, setTargetTime] = useState<number>(Date.now() + DEFAULT_WORK * 60 * 1000);
    const [isRunning, setIsRunning] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [isLongBreak, setIsLongBreak] = useState(false);

    // Pro Features State
    const [focusTask, setFocusTask] = useState('');
    const [completedSessions, setCompletedSessions] = useState(0);

    // Settings State
    const [workTime, setWorkTime] = useState(DEFAULT_WORK);
    const [breakTime, setBreakTime] = useState(DEFAULT_BREAK);
    const [longBreakTime, setLongBreakTime] = useState(DEFAULT_LONG_BREAK);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [tickingEnabled, setTickingEnabled] = useState(false);
    const [autoStart, setAutoStart] = useState(false);
    const [theme, setTheme] = useState('midnight');

    const remainingTimeRef = useRef<number>(DEFAULT_WORK * 60 * 1000);
    const workerRef = useRef<Worker | null>(null);

    // Refs for stable access in timer logic
    const isRunningRef = useRef(isRunning);
    const targetTimeRef = useRef(targetTime);
    const soundEnabledRef = useRef(soundEnabled);
    const tickingEnabledRef = useRef(tickingEnabled);
    const isBreakRef = useRef(isBreak);

    useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
    useEffect(() => { targetTimeRef.current = targetTime; }, [targetTime]);
    useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
    useEffect(() => { tickingEnabledRef.current = tickingEnabled; }, [tickingEnabled]);
    useEffect(() => { isBreakRef.current = isBreak; }, [isBreak]);

    // --- Persistence (Load) ---
    useEffect(() => {
        const saved = localStorage.getItem('pomodoro_preferences');
        let loadedWork = DEFAULT_WORK;
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                loadedWork = parsed.workTime || DEFAULT_WORK;
                setWorkTime(loadedWork);
                setBreakTime(parsed.breakTime || DEFAULT_BREAK);
                setLongBreakTime(parsed.longBreakTime || DEFAULT_LONG_BREAK);
                setSoundEnabled(parsed.soundEnabled ?? true);
                setTickingEnabled(parsed.tickingEnabled ?? false);
                setAutoStart(parsed.autoStart ?? false);
                setTheme(parsed.theme || 'midnight');
                setFocusTask(parsed.focusTask || '');
                setCompletedSessions(parsed.completedSessions || 0);
            } catch (e) {
                console.error("Failed to load prefs", e);
            }
        }

        // Initialize display-only state
        remainingTimeRef.current = loadedWork * 60 * 1000;
        setTargetTime(Date.now() + remainingTimeRef.current);
        setIsBreak(false);
        setIsLongBreak(false);
        setIsRunning(false);

        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }, []);

    // --- Persistence (Save) ---
    useEffect(() => {
        localStorage.setItem('pomodoro_preferences', JSON.stringify({
            workTime,
            breakTime,
            longBreakTime,
            soundEnabled,
            tickingEnabled,
            autoStart,
            theme,
            focusTask,
            completedSessions
        }));
    }, [workTime, breakTime, longBreakTime, soundEnabled, tickingEnabled, autoStart, theme, focusTask, completedSessions]);




    // --- Actions ---

    const startTimer = useCallback(() => {
        if (!isRunning) {
            unlockAudioContext();
            if (soundEnabled) playNotification('start');

            const newTarget = Date.now() + remainingTimeRef.current;
            setTargetTime(newTarget);
            setIsRunning(true);

            requestWakeLock();
            updateBadge(1);
        }
    }, [isRunning, soundEnabled]);

    const pauseTimer = useCallback(() => {
        if (isRunning) {
            if (soundEnabled) playNotification('pause');

            const now = Date.now();
            remainingTimeRef.current = Math.max(0, targetTime - now);
            setIsRunning(false);

            const minutes = Math.floor((remainingTimeRef.current / 1000) / 60);
            const seconds = Math.floor((remainingTimeRef.current / 1000) % 60);
            const mm = String(minutes).padStart(2, '0');
            const ss = String(seconds).padStart(2, '0');
            document.title = `Paused ${mm}:${ss} - Notebook`;
        }
    }, [isRunning, soundEnabled, targetTime]);

    const resetTimer = useCallback(() => {
        if (soundEnabled) playNotification('reset');
        setIsRunning(false);
        setIsBreak(false);
        setIsLongBreak(false);
        const resetMins = workTime;
        remainingTimeRef.current = resetMins * 60 * 1000;
        setTargetTime(Date.now() + remainingTimeRef.current);

        document.title = 'Notebook';
        releaseWakeLock();
        clearBadge();
    }, [soundEnabled, workTime]);

    const handleComplete = useCallback(async () => {
        if (!isRunning) return;

        setIsRunning(false);
        let nextIsBreak = !isBreak;
        let nextIsLongBreak = false;
        let sessionToLogType = isBreak ? (isLongBreak ? 'long_break' : 'short_break') : 'focus';
        let sessionDuration = isBreak ? (isLongBreak ? longBreakTime : breakTime) : workTime;

        let nextCompletedSessions = completedSessions;

        if (!isBreak) {
            nextCompletedSessions = completedSessions + 1;
            setCompletedSessions(nextCompletedSessions);
            // Every 4th focus session completed leads to a long break
            if (nextCompletedSessions % 4 === 0) {
                nextIsLongBreak = true;
            }
        }

        setIsBreak(nextIsBreak);
        setIsLongBreak(nextIsLongBreak);

        const nextDuration = nextIsBreak ? (nextIsLongBreak ? longBreakTime : breakTime) : workTime;
        const nextRemaining = nextDuration * 60 * 1000;
        remainingTimeRef.current = nextRemaining;

        if (soundEnabled) playNotification('complete');
        vibrateDevice([200, 100, 200, 100, 200]);

        const notificationTitle = nextIsBreak ? (nextIsLongBreak ? "🎉 Long Break Time!" : "🎉 Focus Complete!") : "⏰ Break Over!";
        const notificationBody = nextIsBreak
            ? `Great work! Take a ${nextDuration} minute break.`
            : "Time to get back to focus.";
        showTimerNotification(notificationTitle, notificationBody);

        clearBadge();
        sonnerToast(nextIsBreak ? (nextIsLongBreak ? "🎉 Long Break! You earned it." : "🎉 Focus Session Complete!") : "⏰ Break is Over! Back to work.");

        const nextTarget = Date.now() + nextRemaining;
        setTargetTime(nextTarget);

        if (autoStart) {
            setIsRunning(true);
            updateBadge(1);
        }

        // Log session to Supabase in background
        if (user) {
            try {
                const { error } = await supabase.from('focus_sessions').insert({
                    user_id: user.id,
                    session_type: sessionToLogType,
                    duration_minutes: sessionDuration,
                });
                if (error) {
                    console.error("Failed to log focus session", error);
                }
            } catch (err) {
                console.error("Failed to log focus session", err);
            }
        }

    }, [isRunning, isBreak, isLongBreak, breakTime, workTime, longBreakTime, soundEnabled, completedSessions, autoStart, user]);

    const toggleMode = useCallback(() => {
        setIsRunning(false);
        const nextIsBreak = !isBreak;
        setIsBreak(nextIsBreak);
        const nextDuration = nextIsBreak ? breakTime : workTime;
        remainingTimeRef.current = nextDuration * 60 * 1000;
        setTargetTime(Date.now() + remainingTimeRef.current);

        const minutes = Math.floor(nextDuration);
        const mm = String(minutes).padStart(2, '0');
        document.title = `${mm}:00 - ${nextIsBreak ? 'Break' : 'Focus'}`;
    }, [isBreak, breakTime, workTime]);

    const updateWorkTime = useCallback((val: number) => {
        const v = Math.max(1, Math.min(60, val));
        setWorkTime(v);
        if (!isBreak && !isRunning) {
            remainingTimeRef.current = v * 60 * 1000;
            setTargetTime(Date.now() + v * 60 * 1000);
        }
    }, [isBreak, isRunning]);

    const updateBreakTime = useCallback((val: number) => {
        const v = Math.max(1, Math.min(60, val));
        setBreakTime(v);
        if (isBreak && !isLongBreak && !isRunning) {
            remainingTimeRef.current = v * 60 * 1000;
            setTargetTime(Date.now() + v * 60 * 1000);
        }
    }, [isBreak, isLongBreak, isRunning]);

    const updateLongBreakTime = useCallback((val: number) => {
        const v = Math.max(1, Math.min(60, val));
        setLongBreakTime(v);
        if (isBreak && isLongBreak && !isRunning) {
            remainingTimeRef.current = v * 60 * 1000;
            setTargetTime(Date.now() + v * 60 * 1000);
        }
    }, [isBreak, isLongBreak, isRunning]);

    // --- Auth State Sync ---
    useEffect(() => {
        if (!user) {
            setIsRunning(false);
            setIsBreak(false);
            setIsLongBreak(false);
            document.title = 'Notebook';
            workerRef.current?.postMessage('stop');
        }
    }, [user]);

    // --- Worker Logic ---
    useEffect(() => {
        const blob = new Blob([timerWorkerScript], { type: 'application/javascript' });
        workerRef.current = new Worker(URL.createObjectURL(blob));
        return () => workerRef.current?.terminate();
    }, []);

    // Keep handleComplete fresh for the worker callback
    const handleCompleteRef = useRef(handleComplete);
    useEffect(() => {
        handleCompleteRef.current = handleComplete;
    }, [handleComplete]);

    // Main Timer Effect (Worker-driven)
    useEffect(() => {
        const worker = workerRef.current;
        if (!worker) return;

        const handleTickInternal = () => {
            // Use REF for isRunning to avoid stale closure issues when pausing
            if (!isRunningRef.current) return;

            const now = Date.now();
            const diff = targetTimeRef.current - now;

            if (soundEnabledRef.current && tickingEnabledRef.current) {
                playNotification('tick');
            }

            if (diff > 0) {
                const minutes = Math.floor((diff / 1000) / 60);
                const seconds = Math.floor((diff / 1000) % 60);
                const mm = String(minutes).padStart(2, '0');
                const ss = String(seconds).padStart(2, '0');
                const label = isBreakRef.current ? 'Break' : 'Focus';
                document.title = `${mm}:${ss} - ${label}`;

                if ('mediaSession' in navigator) {
                    try {
                        navigator.mediaSession.metadata = new MediaMetadata({
                            title: label,
                            artist: `${mm}:${ss} Remaining`,
                            album: 'Notebook Focus Timer',
                            artwork: [{ src: '/favicon.ico', sizes: '96x96', type: 'image/x-icon' }]
                        });
                    } catch (e) { }
                }
            } else if (diff <= 0) {
                // If the diff is <= 0 and we are RUNNING, complete.
                // If we paused exactly at 0, this prevents a double-trigger.
                handleCompleteRef.current();
            }
        };

        if (isRunning) {
            worker.postMessage('start');
            worker.onmessage = (e) => {
                if (e.data === 'tick') handleTickInternal();
            };
        } else {
            worker.postMessage('stop');
        }

        return () => {
            worker.postMessage('stop');
        };
    }, [isRunning, handleComplete]);

    return (
        <PomodoroContext.Provider value={{
            targetTime, isRunning, isBreak, isLongBreak, workTime, breakTime, longBreakTime, soundEnabled, tickingEnabled, autoStart, theme, focusTask, completedSessions,
            setWorkTime, setBreakTime, setLongBreakTime, setSoundEnabled, setTickingEnabled, setAutoStart, setTheme, setFocusTask, setCompletedSessions,
            startTimer, pauseTimer, resetTimer, handleComplete, toggleMode, updateWorkTime, updateBreakTime, updateLongBreakTime,
            remainingTimeRef
        }}>
            {children}
            {/* Global Toast Overlay could go here if we wanted it on every page, 
                but for now we'll stick to rendering it in the Timer component or Layout.
                Wait, if user is on Dashboard, they might want to see the Toast! 
                Let's stick to simple logic for now, standard rendering in Layout/Component. 
            */}
        </PomodoroContext.Provider>
    );
};

export const usePomodoro = () => {
    const context = useContext(PomodoroContext);
    if (!context) throw new Error("usePomodoro must be used within a PomodoroProvider");
    return context;
};
