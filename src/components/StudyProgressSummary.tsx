import * as React from 'react';
import { CheckCircle2, AlertCircle, Target, BrainCircuit } from 'lucide-react';
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
    <div className="mb-10 p-2 rounded-[2.5rem] bg-indigo-50/30 border border-indigo-100 overflow-hidden relative group">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

      <div className="glass-card rounded-[2.25rem] p-8 border-white/50 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1">
                <Target className="h-3 w-3" />
                Mastery Index
              </div>
              <h3 className="text-3xl font-black tracking-tighter">Learning Velocity</h3>
              <p className="text-muted-foreground font-medium text-sm max-w-sm">
                Real-time tracking of your cognitive retention and structural understanding of this set.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between font-black text-sm tracking-tight">
                <span className="text-indigo-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Mastered {masteredCardsCount} of {totalCards}
                </span>
                <span className="text-xl">{progressPercentage.toFixed(0)}%</span>
              </div>

              <div className="relative h-4 w-full bg-indigo-100 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-nova-gradient animate-nova-gradient shadow-glow transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl bg-secondary/50 border border-border/40 hover:border-primary/20 transition-all group/stat">
              <AlertCircle className={cn(
                "h-6 w-6 mb-4 transition-transform group-hover/stat:scale-110",
                dueCardsCount > 0 ? "text-orange-500" : "text-muted-foreground/40"
              )} />
              <div className="text-2xl font-black tracking-tighter">{dueCardsCount}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Due for Review</div>
            </div>

            <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 hover:border-primary/20 transition-all group/stat">
              <BrainCircuit className="h-6 w-6 mb-4 text-primary transition-transform group-hover/stat:scale-110" />
              <div className="text-2xl font-black tracking-tighter">{totalCards - masteredCardsCount}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Remaining Knowledge</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyProgressSummary;