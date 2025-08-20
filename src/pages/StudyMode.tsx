import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { Progress } from "@/components/ui/progress"; // Import the Progress component

interface CardItem {
  id: string;
  term: string;
  definition: string;
  repetition_level: number;
  ease_factor: number;
  next_review_at: string;
  status: 'learning' | 'mastered';
}

interface UserProgress {
  repetition_level: number;
  ease_factor: number;
  next_review_at: string;
  status: 'learning' | 'mastered';
}

const calculateNextReview = (
  currentProgress: UserProgress | null,
  quality: 0 | 1 | 2 | 3 | 4 | 5 // 5 for perfect, 0 for complete failure
) => {
  let n = currentProgress?.repetition_level ?? 0;
  let EF = currentProgress?.ease_factor ?? 2.5;
  let I = 0; // Interval in days

  if (quality < 3) { // Incorrect response (Difficult)
    n = 0; // Reset repetition level
    EF = Math.max(1.3, EF - 0.20); // Decrease EF, minimum 1.3
    I = 0; // Review immediately or next session
  } else { // Correct response (Mastered)
    n += 1;
    EF = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    EF = Math.max(1.3, EF); // Ensure EF doesn't drop below 1.3

    if (n === 1) {
      I = 1; // First successful repetition: 1 day
    } else if (n === 2) {
      I = 6; // Second successful repetition: 6 days
    } else { // n > 2
      // For subsequent repetitions, I(n) = I(n-1) * EF
      // We approximate I(n-1) based on I(2) and previous EFs
      I = Math.round(6 * Math.pow(EF, n - 2));
    }
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + I);

  return {
    repetition_level: n,
    ease_factor: parseFloat(EF.toFixed(2)), // Store with 2 decimal places
    next_review_at: nextReviewDate.toISOString(),
    status: quality >= 3 ? 'mastered' : 'learning',
  };
};

const fetchCardsForStudySet = async (setId: string): Promise<CardItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const now = new Date(); // Get current time once

  // Fetch all cards for the set with their user progress for the current user
  const { data, error } = await supabase
    .from('cards')
    .select(`
      id,
      term,
      definition,
      user_progress!left(
        repetition_level,
        ease_factor,
        next_review_at,
        status,
        user_id
      )
    `)
    .eq('set_id', setId);

  if (error) {
    console.error("Error fetching cards for study set:", error);
    throw new Error("Failed to fetch cards.");
  }

  if (!data) {
    return [];
  }

  // Process and filter cards to get only those due for review or new cards
  const dueCards = data
    .map(card => {
      const progress = card.user_progress?.[0]; // Get the first (and likely only) progress entry for this user/card
      return {
        id: card.id,
        term: card.term,
        definition: card.definition,
        repetition_level: progress?.repetition_level ?? 0,
        ease_factor: progress?.ease_factor ?? 2.5,
        next_review_at: progress?.next_review_at ?? now.toISOString(), // Default to now for new cards
        status: progress?.status ?? 'learning',
        progress_user_id: progress?.user_id, // Store this to check if progress is for current user
      };
    })
    .filter(card => {
      const cardNextReviewDate = new Date(card.next_review_at);
      // A card is included if:
      // 1. It's a new card (no progress_user_id or progress_user_id doesn't match current user)
      //    OR
      // 2. It has progress for the current user AND its next_review_at is less than or equal to now.
      const isNewCardForCurrentUser = !card.progress_user_id || card.progress_user_id !== user.id;
      const isDueForReview = cardNextReviewDate <= now;

      return isNewCardForCurrentUser || (card.progress_user_id === user.id && isDueForReview);
    })
    .sort((a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime()); // Sort by earliest review date

  return dueCards;
};

const StudyMode = () => {
  const { setId } = useParams<{ setId: string }>();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [studyFinished, setStudyFinished] = useState(false);
  const queryClient = useQueryClient();

  const { data: cards, isLoading, isError, error, refetch } = useQuery<CardItem[], Error>({
    queryKey: ['studyCards', setId],
    queryFn: () => fetchCardsForStudySet(setId!),
    enabled: !!setId,
  });

  const currentCard = cards?.[currentCardIndex];
  const totalCards = cards?.length || 0;
  const progressPercentage = totalCards > 0 ? ((currentCardIndex + (studyFinished ? 1 : 0)) / totalCards) * 100 : 0;


  const handleFlipCard = () => {
    setShowDefinition(!showDefinition);
  };

  const updateCardProgress = async (cardId: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("You must be logged in to track progress.");
        return;
      }

      // Get current progress for the card
      const { data: existingProgress, error: fetchProgressError } = await supabase
        .from('user_progress')
        .select('repetition_level, ease_factor, next_review_at, status')
        .eq('user_id', user.id)
        .eq('card_id', cardId)
        .single();

      if (fetchProgressError && fetchProgressError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw fetchProgressError;
      }

      const newProgress = calculateNextReview(existingProgress || null, quality);

      const { error: upsertError } = await supabase
        .from('user_progress')
        .upsert(
          {
            user_id: user.id,
            card_id: cardId,
            status: newProgress.status,
            repetition_level: newProgress.repetition_level,
            ease_factor: newProgress.ease_factor,
            next_review_at: newProgress.next_review_at,
          },
          { onConflict: 'user_id,card_id' }
        );

      if (upsertError) throw upsertError;
      showSuccess(`Card marked as ${newProgress.status}!`);
      queryClient.invalidateQueries({ queryKey: ['studySet', setId] }); // Invalidate detail page to update mastered count
    } catch (err: any) {
      showError(`Failed to update card progress: ${err.message}`);
      console.error("Error updating card progress:", err);
    }
  };

  const handleNextCard = (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (currentCard) {
      updateCardProgress(currentCard.id, quality);
    }

    if (currentCardIndex < (cards?.length || 0) - 1) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
      setShowDefinition(false);
    } else {
      setStudyFinished(true);
    }
  };

  const handleRestartStudy = () => {
    setCurrentCardIndex(0);
    setShowDefinition(false);
    setStudyFinished(false);
    refetch(); // Re-fetch cards to get updated order based on next_review_at
  };

  if (!setId) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        No study set ID provided.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex flex-col items-center">
        <Skeleton className="h-10 w-3/4 mb-8" />
        <Skeleton className="h-64 w-full max-w-md rounded-lg" />
        <div className="flex gap-4 mt-8">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading cards: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">This study set has no cards due for review, or no cards at all.</p>
        <Button asChild className="mt-4">
          <Link to={`/sets/${setId}`} className="flex items-center">
            <React.Fragment>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Set Details
            </React.Fragment>
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Study Mode</h1>
        <Button asChild variant="outline">
          <Link to={`/sets/${setId}`} className="flex items-center">
            <React.Fragment>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Set
            </React.Fragment>
          </Link>
        </Button>
      </div>

      {/* Progress Bar */}
      {!studyFinished && totalCards > 0 && (
        <div className="w-full max-w-md mb-6">
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-sm text-muted-foreground text-right mt-1">
            {currentCardIndex + 1} / {totalCards}
          </p>
        </div>
      )}

      {studyFinished ? (
        <Card className="w-full max-w-md p-8 text-center">
          <CardTitle className="mb-4">Study Session Complete!</CardTitle>
          <CardContent>
            <p className="text-lg mb-6">You've reviewed all due cards in this set.</p>
            <Button onClick={handleRestartStudy}>
              <RotateCcw className="mr-2 h-4 w-4" /> Restart Study
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            className="relative w-full max-w-md h-64 cursor-pointer perspective"
            onClick={handleFlipCard}
          >
            <Card
              className={`absolute w-full h-full transition-transform duration-700 ease-in-out transform-gpu ${
                showDefinition ? 'rotate-y-180' : 'rotate-y-0'
              }`}
            >
              {/* Front of the card (Term) */}
              <div className="absolute w-full h-full flex flex-col justify-center items-center text-center backface-hidden p-6">
                <CardHeader>
                  <CardTitle className="text-2xl">Term</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                  <p className="text-xl font-medium">
                    {currentCard?.term}
                  </p>
                </CardContent>
              </div>

              {/* Back of the card (Definition) */}
              <div className="absolute w-full h-full flex flex-col justify-center items-center text-center backface-hidden rotate-y-180 p-6">
                <CardHeader>
                  <CardTitle className="text-2xl">Definition</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                  <p className="text-xl font-medium">
                    {currentCard?.definition}
                  </p>
                </CardContent>
              </div>
            </Card>
          </div>

          <div className="mt-8 flex gap-4">
            <Button onClick={handleFlipCard} variant="outline">
              Flip Card
            </Button>
            {showDefinition && (
              <>
                <Button onClick={() => handleNextCard(5)} className="bg-green-500 hover:bg-green-600">
                  Mastered
                </Button>
                <Button onClick={() => handleNextCard(1)} variant="destructive">
                  Difficult
                </Button>
              </>
            )}
            {!showDefinition && (
              <Button onClick={() => handleNextCard(0)}>
                Next Card
              </Button>
            )}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Card {currentCardIndex + 1} of {cards.length}
          </p>
        </>
      )}
    </div>
  );
};

export default StudyMode;