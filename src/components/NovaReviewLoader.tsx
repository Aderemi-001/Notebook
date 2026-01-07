
import { useEffect, useState } from "react";
import { BrainCircuit } from "lucide-react";

export const NovaReviewLoader = () => {
    const [message, setMessage] = useState("Initializing neural link...");

    const messages = [
        "Analyzing your memory patterns...",
        "Identifying optimal review cards...",
        "Calculating spaced repetition intervals...",
        "Preparing your daily knowledge boost...",
        "Synchronizing with the Constellation..."
    ];

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            setMessage(messages[i]);
            i = (i + 1) % messages.length;
        }, 1500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in space-y-8">
            <div className="relative">
                {/* Outer Glow */}
                <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 rounded-full blur-xl animate-pulse" />

                {/* Central Icon */}
                <div className="relative bg-background border-2 border-primary/20 p-8 rounded-full shadow-2xl">
                    <BrainCircuit className="h-16 w-16 text-primary animate-pulse" />

                    {/* Orbiting Particles */}
                    <div className="absolute inset-0 animate-spin-slow">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-violet-500 h-3 w-3 rounded-full blur-[1px]" />
                    </div>
                    <div className="absolute inset-0 animate-reverse-spin">
                        <div className="absolute top-1/2 -right-2 -translate-y-1/2 bg-fuchsia-500 h-2 w-2 rounded-full blur-[1px]" />
                    </div>
                </div>
            </div>

            <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500">
                    Nova AI
                </h3>
                <p className="text-muted-foreground font-mono text-sm min-w-[300px]">
                    {message}
                </p>
            </div>

            <div className="flex gap-2">
                <div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce" />
            </div>
        </div>
    );
};
