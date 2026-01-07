import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Target, Zap } from 'lucide-react';

interface StudyProgressBarProps {
    currentIndex: number;
    totalCards: number;
    masteredCount?: number;
    learningCount?: number;
}

const StudyProgressBar: React.FC<StudyProgressBarProps> = ({
    currentIndex,
    totalCards,
    masteredCount = 0,
    learningCount = 0
}) => {
    const progressPercentage = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;
    const remaining = totalCards - currentIndex - 1;

    return (
        <Card className="mb-6">
            <CardContent className="p-4">
                <div className="space-y-3">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Progress</span>
                            <span className="text-muted-foreground">
                                {currentIndex + 1} / {totalCards}
                            </span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="flex flex-col items-center text-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-950">
                                <Target className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Remaining</p>
                                <p className="font-bold text-sm">{remaining}</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                            <div className="p-1.5 rounded-full bg-orange-50 dark:bg-orange-950">
                                <Zap className="h-3.5 w-3.5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Learning</p>
                                <p className="font-bold text-sm">{learningCount}</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
                            <div className="p-1.5 rounded-full bg-green-50 dark:bg-green-950">
                                <Trophy className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Mastered</p>
                                <p className="font-bold text-sm">{masteredCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default StudyProgressBar;
