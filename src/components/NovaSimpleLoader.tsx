import { Loader2 } from "lucide-react";

interface NovaSimpleLoaderProps {
    message?: string;
    subMessage?: string;
}

export const NovaSimpleLoader = ({ message = "Loading...", subMessage = "Please wait a moment" }: NovaSimpleLoaderProps) => {
    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-card border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <Loader2 className="h-16 w-16 animate-spin text-primary" />
                        <div className="absolute inset-0 h-16 w-16 animate-ping opacity-20 bg-primary rounded-full" />
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold">{message}</h3>
                        {subMessage && (
                            <p className="text-sm text-muted-foreground animate-pulse">{subMessage}</p>
                        )}
                        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden mt-4">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-indeterminate-progress"
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
