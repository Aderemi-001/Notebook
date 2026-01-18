import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MasteryHeatmapProps {
    data: { date: string, count: number }[]; // count is cards mastered on that date
}

export const MasteryHeatmap: React.FC<MasteryHeatmapProps> = ({ data }) => {
    // Generate last 12 weeks of dates
    const weeks = 12;
    const days = 7;
    const today = new Date();


    // Simple helper to get level based on count
    const getLevel = (count: number) => {
        if (count === 0) return 'bg-muted/10';
        if (count < 3) return 'bg-primary/20';
        if (count < 6) return 'bg-primary/40';
        if (count < 10) return 'bg-primary/60';
        return 'bg-primary';
    };

    // Prepare grid data (columns = weeks, rows = days)
    const grid: { date: Date, count: number }[][] = [];
    for (let w = 0; w < weeks; w++) {
        const weekData: { date: Date, count: number }[] = [];
        for (let d = 0; d < days; d++) {
            const date = new Date(today);
            date.setDate(today.getDate() - ((weeks - 1 - w) * 7 + (6 - d)));
            const match = data.find(item => item.date === date.toISOString().split('T')[0]);
            weekData.push({ date, count: match ? match.count : 0 });
        }
        grid.push(weekData);
    }

    return (
        <Card className="glass-card shadow-premium border-white/20">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Mastery Activity</CardTitle>
                <CardDescription>Your learning consistency over the last 12 weeks</CardDescription>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                        {grid.map((week, wIndex) => (
                            <div key={wIndex} className="flex flex-col gap-1.5">
                                {week.map((day, dIndex) => (
                                    <Tooltip key={dIndex}>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={cn(
                                                    "h-3 w-3 rounded-sm transition-all hover:scale-125 hover:ring-2 hover:ring-primary/20",
                                                    getLevel(day.count)
                                                )}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-[10px] p-1.5">
                                            <p className="font-bold">{day.count} cards mastered</p>
                                            <p className="opacity-70">{day.date.toLocaleDateString()}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        ))}
                    </div>
                </TooltipProvider>

                <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-muted-foreground">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-sm bg-muted/10" />
                        <div className="h-2 w-2 rounded-sm bg-primary/20" />
                        <div className="h-2 w-2 rounded-sm bg-primary/40" />
                        <div className="h-2 w-2 rounded-sm bg-primary/70" />
                        <div className="h-2 w-2 rounded-sm bg-primary" />
                    </div>
                    <span>More</span>
                </div>
            </CardContent>
        </Card>
    );
};
