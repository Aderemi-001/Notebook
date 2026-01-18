
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    showTimerNotification,
    vibrateDevice,
    updateBadge,
    clearBadge,
    requestWakeLock,
    releaseWakeLock
} from '@/utils/notifications';

const DEFAULT_WORK = 25;
const DEFAULT_BREAK = 5;

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

interface Toast {
    msg: string;
    type: 'success' | 'info';
}

interface PomodoroContextType {
    targetTime: number;
    isRunning: boolean;
    isBreak: boolean;
    workTime: number;
    breakTime: number;
    soundEnabled: boolean;
    tickingEnabled: boolean;
    theme: string;
    focusTask: string;
    completedSessions: number;
    toast: Toast | null;

    setWorkTime: (n: number) => void;
    setBreakTime: (n: number) => void;
    setSoundEnabled: (b: boolean) => void;
    setTickingEnabled: (b: boolean) => void;
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
    // --- State ---
    const [targetTime, setTargetTime] = useState<number>(new Date().getTime() + DEFAULT_WORK * 60 * 1000);
    const [isRunning, setIsRunning] = useState(false);
    const [isBreak, setIsBreak] = useState(false);

    // Pro Features State
    const [focusTask, setFocusTask] = useState('');
    const [completedSessions, setCompletedSessions] = useState(0);

    // Settings State
    const [workTime, setWorkTime] = useState(DEFAULT_WORK);
    const [breakTime, setBreakTime] = useState(DEFAULT_BREAK);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [tickingEnabled, setTickingEnabled] = useState(false);
    const [theme, setTheme] = useState('midnight');

    // Toast State
    const [toast, setToast] = useState<Toast | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const remainingTimeRef = useRef<number>(DEFAULT_WORK * 60 * 1000);
    const workerRef = useRef<Worker | null>(null);

    // --- Persistence (Load) ---
    useEffect(() => {
        const saved = localStorage.getItem('pomodoro_preferences');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const loadedWork = parsed.workTime || DEFAULT_WORK;
                setWorkTime(loadedWork);
                setBreakTime(parsed.breakTime || DEFAULT_BREAK);
                setSoundEnabled(parsed.soundEnabled ?? true);
                setTickingEnabled(parsed.tickingEnabled ?? false);
                setTheme(parsed.theme || 'midnight');
                setFocusTask(parsed.focusTask || '');
                setCompletedSessions(parsed.completedSessions || 0);

                // Initial Logic
                remainingTimeRef.current = loadedWork * 60 * 1000;
                setTargetTime(new Date().getTime() + loadedWork * 60 * 1000);
                setIsBreak(false);
            } catch (e) {
                console.error("Failed to load prefs", e);
            }
        }

        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }, []);

    // --- Persistence (Save) ---
    useEffect(() => {
        localStorage.setItem('pomodoro_preferences', JSON.stringify({
            workTime,
            breakTime,
            soundEnabled,
            tickingEnabled,
            theme,
            focusTask,
            completedSessions
        }));
    }, [workTime, breakTime, soundEnabled, tickingEnabled, theme, focusTask, completedSessions]);




    // --- Actions ---
    const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast({ msg, type });
        toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
    };

    const startTimer = () => {
        if (!isRunning) {
            unlockAudioContext(); // Explicitly unlock on user gesture
            if (soundEnabled) playNotification('start');
            setTargetTime(new Date().getTime() + remainingTimeRef.current);
            setIsRunning(true);
            // Request wake lock to prevent screen from sleeping
            requestWakeLock();
            // Update badge to show timer is active
            updateBadge(1);
        }
    };

    const pauseTimer = () => {
        if (isRunning) {
            if (soundEnabled) playNotification('pause');
            const now = new Date().getTime();
            remainingTimeRef.current = Math.max(0, targetTime - now);
            setIsRunning(false);
        }
    };

    const resetTimer = () => {
        if (soundEnabled) playNotification('reset');
        setIsRunning(false);
        setIsBreak(false);
        const resetMins = workTime;
        remainingTimeRef.current = resetMins * 60 * 1000;
        setTargetTime(new Date().getTime() + resetMins * 60 * 1000);
        // Release wake lock and clear badge on reset
        releaseWakeLock();
        clearBadge();
    };

    const handleComplete = () => {
        if (!isRunning) return;

        setIsRunning(false);
        const nextIsBreak = !isBreak;

        if (!isBreak) {
            setCompletedSessions(prev => prev + 1);
        }

        setIsBreak(nextIsBreak);
        const nextDuration = nextIsBreak ? breakTime : workTime;
        remainingTimeRef.current = nextDuration * 60 * 1000;

        // Audio notification
        if (soundEnabled) playNotification('complete');

        // Vibration
        vibrateDevice([200, 100, 200, 100, 200]);

        // Web Push Notification
        const notificationTitle = nextIsBreak ? "🎉 Focus Complete!" : "⏰ Break Over!";
        const notificationBody = nextIsBreak
            ? `Great work! Take a ${breakTime} minute break.`
            : "Time to get back to focus.";
        showTimerNotification(notificationTitle, notificationBody);

        // Clear PWA badge
        clearBadge();

        showToast(nextIsBreak ? "🎉 Focus Session Complete!" : "⏰ Break is Over! Back to work.");

        setTargetTime(new Date().getTime() + nextDuration * 60 * 1000);
        setIsRunning(true);
    };

    const toggleMode = () => {
        setIsRunning(false);
        const nextIsBreak = !isBreak;
        setIsBreak(nextIsBreak);
        const nextDuration = nextIsBreak ? breakTime : workTime;
        remainingTimeRef.current = nextDuration * 60 * 1000;
        setTargetTime(new Date().getTime() + nextDuration * 60 * 1000);
    };

    const updateWorkTime = (val: number) => {
        const v = Math.max(0.01, Math.min(60, val));
        setWorkTime(v);
        if (!isBreak && !isRunning) {
            remainingTimeRef.current = v * 60 * 1000;
            setTargetTime(new Date().getTime() + v * 60 * 1000);
        }
    };

    const updateBreakTime = (val: number) => {
        const v = Math.max(1, Math.min(60, val));
        setBreakTime(v);
        if (isBreak && !isRunning) {
            remainingTimeRef.current = v * 60 * 1000;
            setTargetTime(new Date().getTime() + v * 60 * 1000);
        }
    };

    // --- Auth State Sync ---
    const { user } = useAuth();
    useEffect(() => {
        if (!user) {
            // User logged out: kill the timer
            setIsRunning(false);
            setIsBreak(false);
            document.title = 'Notebook'; // Reset title
            workerRef.current?.postMessage('stop'); // Ensure worker stops immediately
        }
    }, [user]);

    // --- Worker Logic ---
    // Initialize Worker
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
        let intervalId: NodeJS.Timeout;

        const handleTick = () => {
            const now = new Date().getTime();
            const diff = targetTime - now;

            // Play Ticking Sound
            if (soundEnabled && tickingEnabled) {
                playNotification('tick');
            }

            if (diff > 0) {
                const minutes = Math.floor((diff / 1000) / 60);
                const seconds = Math.floor((diff / 1000) % 60);
                const mm = String(minutes).padStart(2, '0');
                const ss = String(seconds).padStart(2, '0');
                const label = isBreak ? 'Break Time' : 'Deep Focus';
                document.title = `${mm}:${ss} - ${label}`;

                // iOS Live Activity / Media Session Support
                if ('mediaSession' in navigator) {
                    try {
                        navigator.mediaSession.metadata = new MediaMetadata({
                            title: label,
                            artist: `${mm}:${ss} Remaining`,
                            album: 'Pomodoro Timer',
                            artwork: [
                                { src: '/favicon.ico', sizes: '96x96', type: 'image/x-icon' },
                            ]
                        });
                    } catch (e) {
                        // ignore
                    }
                }
            } else {
                // Timer Complete!
                // Prevent multiple calls if worker ticks fast
                if (isRunning) {
                    handleCompleteRef.current();
                }
            }
        };

        if (!isRunning) {
            // Paused: Update targetTime periodically to keep it "frozen" relative to now
            intervalId = setInterval(() => {
                setTargetTime(new Date().getTime() + remainingTimeRef.current);
            }, 50);

            // Stop worker ticking
            workerRef.current?.postMessage('stop');
        } else {
            // Running: Start worker
            workerRef.current?.postMessage('start');
            // Check existence because strict null checks might complain
            if (workerRef.current) {
                workerRef.current.onmessage = (e) => {
                    if (e.data === 'tick') handleTick();
                };
            }
        }

        return () => {
            clearInterval(intervalId);
            workerRef.current?.postMessage('stop');
        };
    }, [isRunning, targetTime, isBreak, soundEnabled, tickingEnabled, workTime, breakTime]);

    return (
        <PomodoroContext.Provider value={{
            targetTime, isRunning, isBreak, workTime, breakTime, soundEnabled, tickingEnabled, theme, focusTask, completedSessions, toast,
            setWorkTime, setBreakTime, setSoundEnabled, setTickingEnabled, setTheme, setFocusTask, setCompletedSessions,
            startTimer, pauseTimer, resetTimer, handleComplete, toggleMode, updateWorkTime, updateBreakTime,
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
