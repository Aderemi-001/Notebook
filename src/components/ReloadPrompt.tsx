import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export const ReloadPrompt = () => {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    useEffect(() => {
        if (needRefresh) {
            toast("New Update Available", {
                description: "A new version of Notebook is available.",
                action: {
                    label: "Update",
                    onClick: () => updateServiceWorker(true),
                },
                duration: Infinity, // Keep open until clicked
            });
        }
    }, [needRefresh, updateServiceWorker]);

    return null;
};
