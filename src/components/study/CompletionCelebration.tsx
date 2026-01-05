import React from 'react';
import { Trophy, Star, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CompletionCelebrationProps {
    show: boolean;
    totalCards: number;
    masteredCount: number;
    onRestart: () => void;
    onExit: () => void;
}

const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({
    show,
    totalCards,
    masteredCount,
    onRestart,
    onExit
}) => {
    const masteryPercentage = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-md mx-4 animate-in zoom-in-95 duration-500">
                <CardContent className="p-8 text-center space-y-6">
                    {/* Trophy Animation */}
                    <div className="flex justify-center animate-in zoom-in-0 spin-in-180 duration-700">
                        <div className="p-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
                            <Trophy className="h-16 w-16 text-white" />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="animate-in slide-in-from-bottom-4 duration-500 delay-300">
                        <h2 className="text-3xl font-bold mb-2">Study Session Complete!</h2>
                        <p className="text-muted-foreground">
                            Great work! You've completed {totalCards} cards.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 py-4 animate-in slide-in-from-bottom-4 duration-500 delay-500">
                        <div className="p-4 rounded-lg bg-muted">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Star className="h-5 w-5 text-yellow-600" />
                                <span className="text-2xl font-bold">{masteredCount}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Mastered</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Zap className="h-5 w-5 text-orange-600" />
                                <span className="text-2xl font-bold">{masteryPercentage}%</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Accuracy</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 animate-in slide-in-from-bottom-4 duration-500 delay-700">
                        <Button variant="outline" onClick={onExit} className="flex-1">
                            Exit
                        </Button>
                        <Button onClick={onRestart} className="flex-1">
                            Study Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CompletionCelebration;
