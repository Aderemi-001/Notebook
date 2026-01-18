import * as React from 'react';

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Flag, FlagOff, Sparkles, Zap, GraduationCap, Pencil, PlayCircle, MoreVertical } from 'lucide-react';
import { cn } from "@/lib/utils";
import { isPast, isValid } from 'date-fns';

interface CardItem {
  id: string;
  term: string;
  definition: string;
  status?: 'learning' | 'mastered';
  is_flagged?: boolean;
  next_review_at?: string;
  repetition_level?: number;
  has_progress?: boolean;
}

interface StudySetCardsListProps {
  cards: CardItem[];
  handleToggleFlag: (cardId: string, currentFlagStatus: boolean) => Promise<void>;
  onEditCard?: (card: CardItem) => void;
  onStudyCard?: (cardId: string) => void;
  highlightTerm?: string | null;
}

const StudySetCardsList: React.FC<StudySetCardsListProps> = ({ cards, handleToggleFlag, onEditCard, onStudyCard, highlightTerm }) => {

  React.useEffect(() => {
    if (highlightTerm && cards.length > 0) {
      const match = cards.find(c => c.term.toLowerCase() === highlightTerm.toLowerCase());
      if (match) {
        const element = document.getElementById(`card-${match.id}`);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('premium-ring-pulse');
            setTimeout(() => element.classList.remove('premium-ring-pulse'), 3000);
          }, 600);
        }
      }
    }
  }, [highlightTerm, cards]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between border-b border-border/40 pb-6">
        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
          <span className="p-2 bg-primary/10 rounded-xl">
            <GraduationCap className="h-6 w-6 text-primary" />
          </span>
          Curriculum Nodes ({cards.length})
        </h2>

        <div className="flex gap-2">
          {cards.some(c => c.is_flagged) && (
            <div className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-[10px] font-black uppercase tracking-widest border border-yellow-500/20">
              Priority Nodes Active
            </div>
          )}
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="p-20 text-center glass-card rounded-[2.5rem] border-dashed border-border/60">
          <div className="h-24 w-24 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-black mb-2">No Knowledge Nodes Found</h3>
          <p className="text-muted-foreground max-w-xs mx-auto font-medium">
            This study set is a blank canvas. Start by adding your first flashcard node.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 pb-20">
          {cards.map((card: CardItem) => {
            const cardNextReviewDate = card.next_review_at ? new Date(card.next_review_at) : null;
            const isCardDue = cardNextReviewDate && isValid(cardNextReviewDate) && isPast(cardNextReviewDate);
            const isHighlighted = highlightTerm && card.term.toLowerCase() === highlightTerm.toLowerCase();
            const isMastered = card.status === 'mastered';

            return (
              <div
                key={card.id}
                id={`card-${card.id}`}
                className={cn(
                  "group relative overflow-hidden transition-all duration-500 rounded-[2rem]",
                  "glass-card border-white/10 dark:border-white/5",
                  "hover:translate-y-[-4px] active:scale-[0.98]",
                  card.is_flagged && "shadow-[0_0_20px_rgba(234,179,8,0.1)] border-yellow-500/30",
                  isMastered && "border-emerald-500/20 bg-emerald-50/20",
                  isHighlighted && "shadow-glow scale-[1.03] z-10 border-indigo-500/50"
                )}
              >
                {/* Status Indicator Bar */}
                {isMastered && (
                  <div className="absolute top-0 right-0 p-3">
                    <div className="bg-emerald-500 text-white rounded-full p-1 shadow-glow">
                      <Zap className="h-3 w-3 fill-current" />
                    </div>
                  </div>
                )}

                <div className="p-6 pt-8 pb-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h3 className={cn(
                      "text-xl font-black tracking-tight leading-tight flex-1 break-words pr-2",
                      isHighlighted ? "text-primary" : "text-foreground"
                    )}>
                      {card.term}
                    </h3>

                    <div className="shrink-0 -mr-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {onStudyCard && (
                            <DropdownMenuItem onClick={() => onStudyCard(card.id)}>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              <span>Quick Revise</span>
                            </DropdownMenuItem>
                          )}

                          {onEditCard && (
                            <DropdownMenuItem onClick={() => onEditCard(card)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit Card</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => handleToggleFlag(card.id, card.is_flagged || false)}>
                            {card.is_flagged ? (
                              <>
                                <FlagOff className="mr-2 h-4 w-4 text-yellow-600" />
                                <span>Remove Priority</span>
                              </>
                            ) : (
                              <>
                                <Flag className="mr-2 h-4 w-4" />
                                <span>Mark Priority</span>
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <p className="text-muted-foreground font-medium leading-relaxed mb-6 line-clamp-4">
                    {card.definition}
                  </p>

                  <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-auto">
                    <div className="flex items-center gap-2">
                      {isMastered ? (
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-glow" />
                          Mastered
                        </span>
                      ) : isCardDue ? (
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5 animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Review Due
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Level {card.repetition_level || 0}
                        </span>
                      )}
                    </div>

                    {card.repetition_level !== undefined && !isMastered && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              "h-1 w-3 rounded-full transition-colors",
                              level <= (card.repetition_level || 0) ? "bg-primary shadow-glow" : "bg-muted-foreground/20"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudySetCardsList;