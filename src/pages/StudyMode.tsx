import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FlippableCard from "@/components/FlippableCard";
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import StudyProgressBar from '@/components/study/StudyProgressBar';
import CompletionCelebration from '@/components/study/CompletionCelebration';

interface CardItem {
  id: string;
  term: string;
  definition: string;
  repetition_level: number;
  ease_factor: number;
  next_review_at: string;
  status: 'learning' | 'mastered';
  created_at?: string;
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
    n = 0;
    EF = Math.max(1.3, EF - 0.15);
    I = 1; // 1 day
  } else { // quality === 2 (Good)
    n += 1;
    EF = EF + 0.1;
    EF = Math.max(1.3, EF);

    if (n === 1) {
      I = 1;
    } else if (n === 2) {
      I = 6;
    } else {
      I = Math.round(6 * Math.pow(EF, n - 2));
    }
    status = 'mastered';
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

const fetchCardsForStudySet = async (setId: string, hideMastered: boolean, sortOrder: string, cardsCountGoal: number): Promise<CardItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date();

  const { data, error } = await supabase
    .from('cards')
    .select(`
      id,
      term,
      definition,
      created_at,
      user_progress!user_progress_card_id_fkey(
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
    throw error;
  }

  if (!data) return [];

  let processedCards = data
    .map((card: any) => {
      const progress = card.user_progress?.[0];
      return {
        id: card.id,
        term: card.term,
        definition: card.definition,
        created_at: card.created_at,
        repetition_level: progress?.repetition_level ?? 0,
        ease_factor: progress?.ease_factor ?? 2.5,
        next_review_at: progress?.next_review_at ?? now.toISOString(),
        status: progress?.status ?? 'learning',
        progress_user_id: progress?.user_id,
      };
    })
    .filter((card: any) => {
      const cardNextReviewDate = new Date(card.next_review_at);
      const isNewCardForCurrentUser = !card.progress_user_id || card.progress_user_id !== user.id;
      const isDueForReview = cardNextReviewDate <= now;

      if (hideMastered && card.status === 'mastered') {
        return false;
      }

      return isNewCardForCurrentUser || (card.progress_user_id === user.id && isDueForReview);
    });

  if (sortOrder === 'alphabetical_term_asc') {
    processedCards.sort((a: CardItem, b: CardItem) => a.term.localeCompare(b.term));
  } else if (sortOrder === 'random') {
    processedCards.sort(() => Math.random() - 0.5);
  } else if (sortOrder === 'created_at_asc') {
    processedCards.sort((a: CardItem, b: CardItem) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime());
  } else {
    processedCards.sort((a: CardItem, b: CardItem) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime());
  }

  return processedCards.slice(0, cardsCountGoal);
};

const StudyMode = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { user, loading: isLoadingAuth } = useAuth();
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [studyFinished, setStudyFinished] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [learningCount, setLearningCount] = useState(0);
  const queryClient = useQueryClient();

  const { data: cards, isLoading, isError, error, refetch } = useQuery<CardItem[], Error>({
    queryKey: ['studyCards', setId, preferences?.hide_mastered_from_daily_review, preferences?.default_card_sort_order, preferences?.default_study_session_cards_count],
    queryFn: () => fetchCardsForStudySet(
      setId!,
      preferences?.hide_mastered_from_daily_review || false,
      preferences?.default_card_sort_order || 'next_review_at_asc',
      preferences?.default_study_session_cards_count || 20
    ),
    enabled: !!setId && !isLoadingAuth && !isLoadingPreferences,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isLoadingPreferences && preferences) {
      setShowDefinition(preferences.default_flashcard_side === 'definition');
    }
  }, [isLoadingPreferences, preferences]);

  // Update counts when cards load
  useEffect(() => {
    if (cards) {
      const mastered = cards.filter(c => c.status === 'mastered').length;
      const learning = cards.length - mastered;
      setMasteredCount(mastered);
      setLearningCount(learning);
    }
  }, [cards]);

  const currentCard = cards?.[currentCardIndex];
  const totalCards = cards?.length || 0;

  const handleFlipCard = () => {
    setShowDefinition(!showDefinition);
  };

  const updateCardProgress = useCallback(async (cardId: string, quality: 0 | 1 | 2) => {
    try {
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

      // Update local counts
      if (newProgress.status === 'mastered') {
        setMasteredCount(prev => prev + 1);
        setLearningCount(prev => Math.max(0, prev - 1));
      }

      let successMessage = "";
      if (quality === 0) {
        successMessage = "Card marked for immediate re-study.";
      } else if (quality === 1) {
        successMessage = "Card marked for review soon.";
      } else {
        successMessage = "Card mastered! Well done.";
      }
      showSuccess(successMessage);

      queryClient.invalidateQueries({ queryKey: ['studySet', setId] });
      queryClient.invalidateQueries({ queryKey: ['studyDays'] });
    } catch (err: any) {
      showError(`Failed to update card progress: ${err.message}`);
      console.error("Error updating card progress:", err);
    }
  }, [queryClient, setId, user]);

  const handleNextCard = (quality: 0 | 1 | 2) => {
    if (currentCard) {
      updateCardProgress(currentCard.id, quality);
    }

    if (currentCardIndex < (cards?.length || 0) - 1) {
      setCurrentCardIndex((prevIndex: number) => prevIndex + 1);
      setShowDefinition(preferences?.default_flashcard_side === 'definition');
    } else {
      setStudyFinished(true);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (studyFinished) return;

      switch (e.key) {
        case ' ': // Space - flip card
          e.preventDefault();
          handleFlipCard();
          break;
        case 'ArrowRight': // Next card (if definition is showing)
          if (showDefinition && currentCard) {
            handleNextCard(2); // Default to "Good"
          }
          break;
        case 'ArrowLeft': // Previous card
          if (currentCardIndex > 0) {
            setCurrentCardIndex(currentCardIndex - 1);
            setShowDefinition(false);
          }
          break;
        case '1': // Again
          if (showDefinition && currentCard) {
            handleNextCard(0);
          }
          break;
        case '2': // Hard
          if (showDefinition && currentCard) {
            handleNextCard(1);
          }
          break;
        case '3': // Good
          if (showDefinition && currentCard) {
            handleNextCard(2);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentCardIndex, showDefinition, studyFinished, currentCard, handleNextCard, handleFlipCard]);

  const handleRestartStudy = () => {
    setCurrentCardIndex(0);
    setShowDefinition(preferences?.default_flashcard_side === 'definition');
    setStudyFinished(false);
    setMasteredCount(0); // Reset counts
    refetch();
  };

  // Touch handlers for swipe gestures
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe Left -> Next Card (Good)
      if (showDefinition && currentCard) {
        handleNextCard(2);
      } else if (!showDefinition) {
        // Optional: Shake or hint to flip first? For now, just flip.
        handleFlipCard();
      }
    }

    if (isRightSwipe) {
      // Swipe Right -> Previous Card
      if (currentCardIndex > 0) {
        setCurrentCardIndex(currentCardIndex - 1);
        setShowDefinition(preferences?.default_flashcard_side === 'definition'); // user pref or false
      }
    }
  };

  if (!setId) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500 animate-fade-in">
        No study set ID provided.
      </div>
    );
  }

  if (isLoadingAuth || isLoading || isLoadingPreferences) {
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
        Error loading cards: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-10 text-center animate-fade-in">
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Please log in or sign up to start studying this set.</p>
          <Button asChild className="mt-4">
            <Link to="/login">Log In / Sign Up</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg animate-fade-in">
        <p className="text-muted-foreground">This study set has no cards due for review, or no cards at all.</p>
        <Button asChild className="mt-4">
          <Link to={`/sets/${setId}`} className="flex items-center">
            <>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Set Details
            </>
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 flex flex-col items-center animate-fade-in relative">
      <CompletionCelebration
        show={studyFinished}
        totalCards={totalCards}
        masteredCount={masteredCount}
        onRestart={handleRestartStudy}
        onExit={() => navigate(`/sets/${setId}`)}
      />

      <div className="w-full flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Study Mode</h1>
        <Button asChild variant="outline">
          <Link to={`/sets/${setId}`} className="flex items-center">
            <>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Set Details
            </>
          </Link>
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md mb-6">
        <StudyProgressBar
          currentIndex={currentCardIndex}
          totalCards={totalCards}
          masteredCount={masteredCount}
          learningCount={learningCount}
        />
      </div>

      {!studyFinished && currentCard ? (
        <div
          className="w-full max-w-md perspective-1000 touch-pan-y"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <FlippableCard
            key={currentCard.id}
            isFlipped={showDefinition}
            onClick={handleFlipCard}
            className="w-full min-h-[300px]"
            frontContent={
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Term</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-center justify-center">
                  <p className="text-2xl font-semibold mb-8">{currentCard.term}</p>
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Tap to Flip • Swift Left to Next
                  </p>
                </CardContent>
              </div>
            }
            backContent={
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 bg-slate-50 dark:bg-slate-900/50">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Definition</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-center justify-center w-full">
                  <p className="text-xl mb-8">{currentCard.definition}</p>

                  <div className="grid grid-cols-3 gap-2 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="destructive"
                      onClick={() => handleNextCard(0)}
                      className="w-full"
                    >
                      Again
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleNextCard(1)}
                      className="w-full bg-orange-100 text-orange-900 hover:bg-orange-200"
                    >
                      Hard
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => handleNextCard(2)}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Good
                    </Button>
                  </div>
                </CardContent>
              </div>
            }
          />

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Card {currentCardIndex + 1} of {cards.length}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StudyMode;