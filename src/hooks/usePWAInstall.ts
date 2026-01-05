import { useState, useEffect } from 'react';

const USAGE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const USAGE_KEY = 'nova_usage_time_ms';
const DISMISSED_KEY = 'nova_pwa_prompt_dismissed';

export const usePWAInstall = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // 1. Detect Environment
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        const standalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

        setIsIOS(ios);
        setIsStandalone(standalone);

        // 2. Capture Android/Chrome Install Prompt
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 3. Track Usage Time
        const startTime = Date.now();

        const updateUsage = () => {
            if (standalone || localStorage.getItem(DISMISSED_KEY)) return;

            const currentTime = Date.now();
            const sessionDuration = currentTime - startTime;
            const totalUsage = parseInt(localStorage.getItem(USAGE_KEY) || '0') + sessionDuration;

            localStorage.setItem(USAGE_KEY, totalUsage.toString());

            if (totalUsage >= USAGE_THRESHOLD_MS) {
                setShowPrompt(true);
            }
        };

        // Update every minute
        const interval = setInterval(updateUsage, 60000);

        // Initial check
        const currentTotal = parseInt(localStorage.getItem(USAGE_KEY) || '0');
        if (currentTotal >= USAGE_THRESHOLD_MS && !standalone && !localStorage.getItem(DISMISSED_KEY)) {
            setShowPrompt(true);
        }

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            // Final update on unmount
            updateUsage();
        };
    }, [isStandalone]);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        }
    };

    const dismissPrompt = () => {
        setShowPrompt(false);
        localStorage.setItem(DISMISSED_KEY, 'true');
    };

    return { showPrompt, isIOS, handleInstall, dismissPrompt, isStandalone };
};
