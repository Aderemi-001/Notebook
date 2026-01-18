import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from "@/lib/utils";

interface StudyRiskScoreProps {
    score: number; // 0-100
    trend: 'improving' | 'declining' | 'stable';
    lastUpdated: string;
}

export const StudyRiskScore: React.FC<StudyRiskScoreProps> = ({ score, trend, lastUpdated }) => {
    const getRiskLevel = (s: number) => {
        if (s < 30) return { label: 'Low Risk', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' };
        if (s < 70) return { label: 'Moderate Risk', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
        return { label: 'High Risk', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
    };

    const risk = getRiskLevel(score);

    return (
        <Card className={cn("glass-card border-l-4", risk.border, risk.bg)}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            Study Risk Score
                            <AlertCircle className={cn("h-4 w-4", risk.color)} />
                        </CardTitle>
                        <CardDescription>Based on memory decay & consistency</CardDescription>
                    </div>
                    <div className={cn("px-2 py-1 rounded text-xs font-bold uppercase tracking-wider", risk.color, "bg-white/50 backdrop-blur-sm")}>
                        {risk.label}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-end justify-between">
                        <div className="text-4xl font-black">{score}%</div>
                        <div className="flex items-center gap-1 text-sm font-medium">
                            {trend === 'improving' && <TrendingDown className="h-4 w-4 text-green-500" />}
                            {trend === 'declining' && <TrendingUp className="h-4 w-4 text-red-500" />}
                            {trend === 'stable' && <Minus className="h-4 w-4 text-muted-foreground" />}
                            <span className={cn(
                                trend === 'improving' ? 'text-green-500' :
                                    trend === 'declining' ? 'text-red-500' : 'text-muted-foreground'
                            )}>
                                {trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Declining' : 'Stable'}
                            </span>
                        </div>
                    </div>
                    <Progress value={score} className="h-2" />
                    <p className="text-[10px] text-muted-foreground italic">
                        Last calculated: {lastUpdated}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};
