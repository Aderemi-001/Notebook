import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FlippableCard from "@/components/FlippableCard";
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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
  quality: 0 | 1 | 2
) => {
  let n = currentProgress?.repetition_level ?? 0;
  let EF = currentProgress?.ease_factor ?? 2.5;
  let I = 0;
  let status: 'learning' | 'mastered' = 'learning';

  if (quality === 0) { // Again
    n = 0;
    EF = Math.max(1.3, EF - 0.20);
    I = 0; // Immediately
  } else if (quality === 1) { // Hard
    n = 0; // Reset repetition level
    EF = Math.max(1.3, EF - 0.15); // Slightly less severe decrease
    I = 1; // 1 day
  } else { // quality === 2 (Good)
    n += 1;
    EF = EF + 0.1; // Simple increase for good recall
    EF = Math.max(1.3, EF); // Ensure EF doesn't go below 1.3

    if (n === 1) {
      I = 1; // First successful recall, 1 day
    } else if (n === 2) {
      I = 6; // Second successful recall, 6 days
    } else {
      I = Math.round(6 * Math.pow(EF, n - 2)); // Standard SM-2 for subsequent recalls
    }
    status = 'mastered'; // Mark as mastered if recalled well
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + I);

  return {
    repetition_level: n,
    ease_factor: parseFloat(EF.toFixed(2)),
    next_review_at: nextReviewDate.toISOString(),
    status: status,
  };
};

const fetchCardsForStudySet = async (setId: string): Promise<CardItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const now = new Date();

  const { data, error } = await supabase
    .from('cards')
    .select(`
      id,
      term,
      definition,
      user_progress!user_progress_card_id_fkey!left(
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
    throw error; // Throw the actual Supabase error
  }

  if (!data) {
    return [];
  }

  const dueCards = data
    .map(card => {
      const progress = card.user_progress?.[0];
      return {
        id: card.id,
        term: card.term,
        definition: card.definition,
        repetition_level: progress?.repetition_level ?? 0,
        ease_factor: progress?.ease_factor ?? 2.5,
        next_review_at: progress?.next_review_at ?? now.toISOString(),
        status: progress?.status ?? 'learning',
        progress_user_id: progress?.user_id,
      };
    })
    .filter(card => {
      const cardNextReviewDate = new Date(card.next_review_at);
      const isNewCardForCurrentUser = !card.progress_user_id || card.progress_user_id !== user.id;
      const isDueForReview = cardNextReviewDate <= now;

      return isNewCardForCurrentUser || (card.progress_user_id === user.id && isDueForReview);
    })
    .sort((a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime());

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

  const updateCardProgress = useCallback(async (cardId: string, quality: 0 | 1 | 2) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("You must be logged in to track progress.");
        return;
      }

      const { data: existingProgress, error: fetchProgressError } = await supabase
        .from('user_progress')
        .select('repetition_level, ease_factor, next_review_at, status')
        .eq('user_id', user.id)
        .eq('card_id', cardId)
        .single();

      if (fetchProgressError && fetchProgressError.code !== 'PGRST116') {
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
      queryClient.invalidateQueries({ queryKey: ['studySet', setId] });
    } catch (err: any) {
      showError(`Failed to update card progress: ${err.message}`);
      console.error("Error updating card progress:", err);
    }
  }, [queryClient, setId]);

  const handleNextCard = (quality: 0 | 1 | 2) => {
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
    refetch();
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
        <div className="w-full max-w-md">
          <FlippableCard
            isFlipped={false}
            frontContent={
              <>
                <CardTitle className="mb-4">Study Session Complete!</CardTitle>
                <CardContent>
                  <p className="text-lg mb-6">You've reviewed all due cards in this set.</p>
                  <Button onClick={handleRestartStudy}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Restart Study
                  </Button>
                </CardContent>
              </>
            }
            backContent={<></>}
            className="h-64"
          />
        </div>
      ) : (
        <>
          <FlippableCard
            key={currentCard?.id || 'study-card'}
            isFlipped={showDefinition}
            onClick={handleFlipCard}
            className="w-full max-w-md h-64"
            frontContent={
              <>
                <CardHeader>
                  <CardTitle className="text-2xl">Term</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                  <p className="text-xl font-medium">
                    {currentCard?.term}
                  </p>
                </CardContent>
              </>
            }
            backContent={
              <>
                <CardHeader>
                  <CardTitle className="text-2xl">Definition</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                  <p className="text-xl font-medium">
                    {currentCard?.definition}
                  </p>
                </CardContent>
              </>
            }
          />

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {!showDefinition && (
              <Button onClick={handleFlipCard} variant="outline" className="w-full sm:w-auto">
                Flip Card
              </Button>
            )}
            {showDefinition && (
              <>
                <Button onClick={() => handleNextCard(0)} variant="destructive" className="w-full sm:w-auto">
                  Again (0)
                </Button>
                <Button onClick={() => handleNextCard(1)} variant="secondary" className="w-full sm:w-auto">
                  Hard (1)
                </Button>
                <Button onClick={() => handleNextCard(2)} className="bg-green-500 hover:bg-green-600 w-full sm:w-auto">
                  Good (2)
                </Button>
              </>
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