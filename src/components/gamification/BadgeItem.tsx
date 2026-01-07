
import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, Trophy, Star, Flame, Zap, Target, BookOpen, Brain, Sparkles, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface Badge {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon_name: string;
    category: 'general' | 'streak' | 'mastery' | 'creation';
    awarded_at?: string; // If present, user has this badge
}

interface BadgeItemProps {
    badge: Badge;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string; // Added className prop
}

const iconMap: Record<string, LucideIcon> = {
    'trophy': Trophy,
    'star': Star,
    'flame': Flame,
    'zap': Zap,
    'target': Target,
    'book-open': BookOpen,
    'brain': Brain,
    'sparkles': Sparkles,
};

export const BadgeItem: React.FC<BadgeItemProps> = ({ badge, size = 'md', showLabel = true, className }) => {
    const isUnlocked = !!badge.awarded_at;
    const Icon = iconMap[badge.icon_name] || Trophy;

    const sizeClasses = {
        sm: "w-10 h-10",
        md: "w-16 h-16",
        lg: "w-24 h-24"
    };

    const iconSizes = {
        sm: "w-5 h-5",
        md: "w-8 h-8",
        lg: "w-12 h-12"
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn("flex flex-col items-center gap-2 group cursor-help", className)}>
                        <div className={cn(
                            "relative flex items-center justify-center rounded-full transition-all duration-500",
                            sizeClasses[size],
                            isUnlocked
                                ? "bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-lg shadow-amber-500/20 group-hover:scale-110 group-hover:shadow-amber-500/40"
                                : "bg-muted/50 grayscale opacity-70 border-2 border-dashed border-muted-foreground/30"
                        )}>
                            {/* Inner Shine for Unlocked */}
                            {isUnlocked && (
                                <div className="absolute inset-0 rounded-full bg-white/20 blur-sm pointer-events-none" />
                            )}

                            {/* Icon */}
                            <Icon className={cn(
                                "relative z-10 text-white drop-shadow-md transition-transform duration-500 group-hover:rotate-12",
                                iconSizes[size],
                                !isUnlocked && "text-muted-foreground"
                            )} />

                            {/* Lock Overlay for Locked */}
                            {!isUnlocked && (
                                <div className="absolute -bottom-1 -right-1 bg-muted text-muted-foreground p-1 rounded-full border border-background shadow-sm">
                                    <Lock className="w-3 h-3" />
                                </div>
                            )}
                        </div>

                        {showLabel && (
                            <div className="text-center space-y-0.5">
                                <p className={cn(
                                    "text-xs font-bold leading-tight",
                                    isUnlocked ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {badge.name}
                                </p>
                                {isUnlocked && (
                                    <p className="text-[10px] text-amber-600 font-medium animate-pulse">
                                        Unlocked!
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px] text-center p-4">
                    <p className="font-bold text-sm mb-1">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                    {isUnlocked && (
                        <p className="text-[10px] text-amber-500 font-bold mt-2 uppercase tracking-wider">
                            Awarded {new Date(badge.awarded_at!).toLocaleDateString()}
                        </p>
                    )}
                    {!isUnlocked && (
                        <p className="text-[10px] text-muted-foreground mt-2 italic">
                            Locked
                        </p>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
