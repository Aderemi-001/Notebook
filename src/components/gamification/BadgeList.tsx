
import React from 'react';
import { Badge, BadgeItem } from './BadgeItem';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface BadgeListProps {
    badges: Badge[];
    isLoading: boolean;
    className?: string;
}

export const BadgeList: React.FC<BadgeListProps> = ({ badges, isLoading, className }) => {

    if (isLoading) {
        return (
            <div className={cn("grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4", className)}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <Skeleton className="h-3 w-12" />
                    </div>
                ))}
            </div>
        );
    }

    if (!badges || badges.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
                <p>No badges available yet. Start studying to unlock them!</p>
            </div>
        );
    }

    // Group by category for cleaner display
    const categories = Array.from(new Set(badges.map(b => b.category)));

    return (
        <ScrollArea className={cn("w-full pr-4 h-full", className)}>
            <div className="space-y-8">
                {categories.map((category) => {
                    const categoryBadges = badges.filter(b => b.category === category);
                    return (
                        <div key={category} className="space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/70 border-b border-border/50 pb-2">
                                {category.charAt(0).toUpperCase() + category.slice(1)} Badges
                            </h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8">
                                {categoryBadges.map((badge) => (
                                    <BadgeItem key={badge.id} badge={badge} size="md" />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
};
