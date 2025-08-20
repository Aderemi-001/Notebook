import React from 'react';
import { Progress } from "@/components/ui/progress";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudyProgressSummaryProps {
  totalCards: number;
  masteredCardsCount: number;
  dueCardsCount: number;
}

const StudyProgressSummary: React.FC<StudyProgressSummaryProps> = ({
  totalCards,
  masteredCardsCount,
  dueCardsCount,
}) => {
  const progressPercentage = totalCards > 0 ? (masteredCardsCount / totalCards) * 100 : 0;

  return (
    <NotebookCard className="mb-6">
      <CardHeader>
        <CardTitle>Study Progress</CardTitle>
        <CardDescription>Overview of your learning progress for this set.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-muted-foreground">
            <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
            <span>Mastered: {masteredCardsCount} / {totalCards} cards</span>
          </div>
          <span className="font-semibold">{progressPercentage.toFixed(0)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        {dueCardsCount > 0 && (
          <div className="flex items-center text-sm text-red-500 mt-2">
            <AlertCircle className="mr-2 h-4 w-4" />
            <span>{dueCardsCount} cards due for review</span>
          </div>
        )}
        {totalCards === 0 && (
          <p className="text-sm text-muted-foreground">No cards in this set to track progress.</p>
        )}
      </CardContent>
    </NotebookCard>
  );
};

export default StudyProgressSummary;