import * as React from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { X, Share, PlusSquare, Download } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
    const { showPrompt, isIOS, handleInstall, dismissPrompt, isStandalone } = usePWAInstall();

    if (!showPrompt || isStandalone) return null;

    return (
        <div className="fixed bottom-24 left-4 right-4 z-[60] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-card bg-background/95 backdrop-blur-md border shadow-2xl p-5 rounded-2xl relative overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={dismissPrompt}
                    className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </button>

                <div className="flex gap-4 items-start pr-6">
                    <div className="bg-primary/10 rounded-xl p-3 shrink-0">
                        <Download className="h-6 w-6 text-primary" />
                    </div>

                    <div className="space-y-1">
                        <h3 className="font-bold text-foreground">Install Notebook</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            You've been studying hard! Add Notebook to your homescreen for a faster, full-screen experience.
                        </p>
                    </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                    {isIOS ? (
                        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">How to Install on iOS:</p>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="bg-background rounded-md p-1.5 border shadow-sm">
                                    <Share className="h-4 w-4 text-blue-500" />
                                </div>
                                <span>1. Tap the <strong>Share</strong> button below</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="bg-background rounded-md p-1.5 border shadow-sm">
                                    <PlusSquare className="h-4 w-4" />
                                </div>
                                <span>2. Select <strong>Add to Home Screen</strong></span>
                            </div>
                        </div>
                    ) : (
                        <Button onClick={handleInstall} className="w-full h-11 font-semibold shadow-lg">
                            Install Now
                        </Button>
                    )}

                    <Button variant="ghost" size="sm" onClick={dismissPrompt} className="text-muted-foreground text-xs h-8">
                        Maybe later
                    </Button>
                </div>
            </div>
        </div>
    );
};
