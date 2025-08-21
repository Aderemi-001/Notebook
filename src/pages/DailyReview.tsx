import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import FlippableCard from "@/components/FlippableCard";
import { ArrowLeft, RotateCcw, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { Progress } from "@/components/ui/progress";
import { NotebookCard } from '@/components/NotebookCard';
import { useUserPreferences } from '@/hooks/use-user-preferences';

interface CardItem {
  id: string;
  term: string;
  definition: string;
  repetition_level: number;
  ease_factor: number;
  next_review_at: string;
  status: 'learning' | 'mastered';
  set_id: string;
  set_title: string;
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

const fetchDailyReviewCards = async (): Promise<CardItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .rpc('get_daily_review_cards', { p_user_id: user.id });

  if (error) {
    console.error("Error fetching daily review cards:", error);
    throw error;
  }
  return data || [];
};

const DailyReview: React.FC = () => {
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const queryClient = useQueryClient();

  const { data: cards, isLoading, isError, error, refetch } = useQuery<CardItem[], Error>({
    queryKey: ['dailyReviewCards'],
    queryFn: fetchDailyReviewCards,
    staleTime: 0, // Always refetch for a fresh session
  });

  useEffect(() => {
    if (!isLoadingPreferences && preferences) {
      setShowDefinition(preferences.default_flashcard_side === 'definition');
    }
  }, [isLoadingPreferences, preferences]);

  const currentCard = cards?.[currentCardIndex];
  const totalCards = cards?.length || 0;
  const progressPercentage = totalCards > 0 ? ((currentCardIndex + (sessionFinished ? 1 : 0)) / totalCards) * 100 : 0;

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
      
      let successMessage = "";
      if (quality === 0) {
        successMessage = "Card marked for immediate re-study.";
      } else if (quality === 1) {
        successMessage = "Card marked for review soon.";
      } else { // quality === 2
        successMessage = "Card mastered! Well done.";
      }
      showSuccess(successMessage);

      queryClient.invalidateQueries({ queryKey: ['dueCardsCount'] }); // Update global due cards count
      queryClient.invalidateQueries({ queryKey: ['studyDays'] }); // Invalidate studyDays query
    } catch (err: any) {
      showError(`Failed to update card progress: ${err.message}`);
      console.error("Error updating card progress:", err);
    }
  }, [queryClient]);

  const handleNextCard = (quality: 0 | 1 | 2) => {
    if (currentCard) {
      updateCardProgress(currentCard.id, quality);
    }

    if (currentCardIndex < (cards?.length || 0) - 1) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
      setShowDefinition(preferences?.default_flashcard_side === 'definition'); // Reset to default side
    } else {
      setSessionFinished(true);
    }
  };

  const handleRestartSession = () => {
    setCurrentCardIndex(0);
    setShowDefinition(preferences?.default_flashcard_side === 'definition');
    setSessionFinished(false);
    refetch(); // Fetch a new set of cards for the session
  };

  if (isLoading || isLoadingPreferences) {
    return (
      <div className="container mx-auto py-10 flex flex-col items-center animate-fade-in">
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
      <div className="container mx-auto py-10 text-center text-red-500 animate-fade-in">
        Error loading daily review cards: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="container mx-auto py-10 text-center animate-fade-in">
        <NotebookCard className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl">No Cards Due Today!</CardTitle>
            <CardDescription>
              You've either mastered all your cards, or there are no new cards due for review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Keep up the great work! You can always create new study sets or explore public ones.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/create">
                  <BookOpen className="mr-2 h-4 w-4" /> Create New Set
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/explore-public-sets">
                  <BookOpen className="mr-2 h-4 w-4" /> Explore Public Sets
                </Link>
              </Button>
            </div>
            <Button onClick={handleRestartSession} variant="ghost">
              <RotateCcw className="mr-2 h-4 w-4" /> Check Again
            </Button>
          </CardContent>
        </NotebookCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 flex flex-col items-center animate-fade-in">
      <div className="w-full flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Daily Review</h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
          </Link>
        </Button>
      </div>

      {/* Progress Bar */}
      {!sessionFinished && totalCards > 0 && (
        <div className="w-full max-w-md mb-6">
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-sm text-muted-foreground text-right mt-1">
            Card {currentCardIndex + 1} / {totalCards}
          </p>
        </div>
      )}

      {sessionFinished ? (
        <NotebookCard className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Daily Review Complete!</CardTitle>
            <CardDescription>
              You've reviewed all cards for this session. Great job!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleRestartSession} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" /> Start New Session
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
              </Link>
            </Button>
          </CardContent>
        </NotebookCard>
      ) : (
        <>
          <FlippableCard
            key={currentCard?.id || 'daily-review-card'}
            isFlipped={showDefinition}
            onClick={handleFlipCard}
            className="w-full max-w-md min-h-[256px]"
            frontContent={
              <>
                <CardHeader>
                  <CardTitle className="text-2xl">Term</CardTitle>
                  {currentCard?.set_title && (
                    <CardDescription className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-1 h-3 w-3" /> From: {currentCard.set_title}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center p-4 overflow-y-auto scrollbar-hide">
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
                  {currentCard?.set_title && (
                    <CardDescription className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-1 h-3 w-3" /> From: {currentCard.set_title}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center p-4 overflow-y-auto scrollbar-hide">
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
                  Again
                </Button>
                <Button onClick={() => handleNextCard(1)} className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto">
                  Hard
                </Button>
                <Button onClick={() => handleNextCard(2)} className="bg-green-500 hover:bg-green-600 w-full sm:w-auto">
                  Good
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

export default DailyReview;