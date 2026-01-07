import React from 'react';
import BrandLogo from './BrandLogo';

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
            <div className="relative flex flex-col items-center">
                {/* Animated gradient background */}
                <div className="absolute inset-0 -inset-20">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 blur-3xl animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-l from-blue-500/10 via-transparent to-purple-500/10 blur-2xl animate-pulse [animation-delay:0.5s]" />
                </div>

                {/* Logo Container with modern styling */}
                <div className="relative z-10 mb-8">
                    <div className="relative group">
                        {/* Outer glow ring */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-purple-500/30 to-primary/30 rounded-[2rem] blur-xl group-hover:blur-2xl transition-all duration-1000 animate-pulse" />

                        {/* Logo Icon Base (App Icon Style) */}
                        <div className="relative animate-float flex items-center justify-center overflow-hidden">
                            <BrandLogo size="xl" rounded="2xl" shadow />
                        </div>
                    </div>
                </div>

                {/* Brand Text */}
                <div className="relative z-10 text-center space-y-3">
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent animate-gradient">
                        NOTEBOOK
                    </h1>
                    <p className="text-sm text-muted-foreground/70 tracking-wide">
                        Your AI-Powered Study Companion
                    </p>
                </div>

                {/* Loading dots */}
                <div className="relative z-10 mt-8 flex gap-2">
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-full animate-bounce" />
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                .animate-gradient {
                    background-size: 200% auto;
                    animation: gradient 3s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
