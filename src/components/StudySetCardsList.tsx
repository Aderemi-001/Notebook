import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription, NotebookCard } from "@/components/NotebookCard";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flag, FlagOff } from 'lucide-react';
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
}

const StudySetCardsList: React.FC<StudySetCardsListProps> = ({ cards, handleToggleFlag }) => {
  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">Cards ({cards.length})</h2>
      {cards.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No cards in this set yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const cardNextReviewDate = card.next_review_at ? new Date(card.next_review_at) : null;
            const isCardDue = cardNextReviewDate && isValid(cardNextReviewDate) && isPast(cardNextReviewDate);

            return (
              <NotebookCard
                key={card.id}
                className={cn(
                  "hover:shadow-md transition-shadow",
                  card.is_flagged && "border-yellow-500 border-2",
                  card.status === 'mastered' && "border-green-500 border-2",
                  card.status === 'learning' && card.has_progress && card.repetition_level === 0 && isCardDue && "border-red-500 border-2",
                  card.status === 'learning' && card.has_progress && card.repetition_level === 0 && cardNextReviewDate && isValid(cardNextReviewDate) && !isCardDue && "border-orange-500 border-2"
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold">{card.term}</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleFlag(card.id, card.is_flagged || false);
                          }}
                          className="h-8 w-8"
                        >
                          {card.is_flagged ? (
                            <Flag className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <FlagOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {card.is_flagged ? "Unflag card" : "Flag card"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent>
                  <CardDescription>{card.definition}</CardDescription>
                </CardContent>
              </NotebookCard>
            );
          })}
        </div>
      )}
    </>
  );
};

export default StudySetCardsList;