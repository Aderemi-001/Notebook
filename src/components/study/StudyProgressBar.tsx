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
                    <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="flex items-center gap-2 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-950">
                                <Target className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Remaining</p>
                                <p className="font-semibold">{remaining}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                            <div className="p-2 rounded-full bg-orange-50 dark:bg-orange-950">
                                <Zap className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Learning</p>
                                <p className="font-semibold">{learningCount}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
                            <div className="p-2 rounded-full bg-green-50 dark:bg-green-950">
                                <Trophy className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Mastered</p>
                                <p className="font-semibold">{masteredCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default StudyProgressBar;
