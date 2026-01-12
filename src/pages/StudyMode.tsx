import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import FlippableCard from "@/components/FlippableCard";
import { ArrowLeft, Volume2, Lock, Sparkles } from 'lucide-react';
import { speak } from '@/utils/audio';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import StudyProgressBar from '@/components/study/StudyProgressBar';
import { gamificationService } from '@/services/gamificationService';
import CompletionCelebration from '@/components/study/CompletionCelebration';
import { useSubscription } from '@/hooks/useSubscription';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const fetchCardsForStudySet = async (setId: string, hideMastered: boolean, sortOrder: string, cardsCountGoal: number, targetCardId?: string | null): Promise<CardItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date();

  let query = supabase
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

  if (targetCardId) {
    query = query.eq('id', targetCardId);
  }

  const { data, error } = await query;

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
    });

  // If targeting a specific card, skip the standard filtering/sorting logic
  if (targetCardId) {
    return processedCards;
  }

  processedCards = processedCards.filter((card: any) => {
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
  const [searchParams] = useSearchParams(); // Needs import
  const targetCardId = searchParams.get('cardId');

  const { user, loading: isLoadingAuth } = useAuth();
  const { isPremium } = useSubscription();
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [studyFinished, setStudyFinished] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [learningCount, setLearningCount] = useState(0);
  const queryClient = useQueryClient();

  const { data: cards, isLoading, isError, error, refetch } = useQuery<CardItem[], Error>({
    queryKey: ['studyCards', setId, preferences?.hide_mastered_from_daily_review, preferences?.default_card_sort_order, preferences?.default_study_session_cards_count, targetCardId],
    queryFn: () => fetchCardsForStudySet(
      setId!,
      preferences?.hide_mastered_from_daily_review || false,
      preferences?.default_card_sort_order || 'next_review_at_asc',
      preferences?.default_study_session_cards_count || 20,
      targetCardId
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

      // Transform existingProgress to match UserProgress interface (handle nulls)
      const transformedProgress = existingProgress ? {
        repetition_level: existingProgress.repetition_level ?? 0,
        ease_factor: existingProgress.ease_factor ?? 2.5,
        next_review_at: existingProgress.next_review_at ?? new Date().toISOString(),
        status: (existingProgress.status === 'mastered' ? 'mastered' : 'learning') as 'learning' | 'mastered'
      } : null;
      const newProgress = calculateNextReview(transformedProgress, quality);

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

      // Check for streak update (fire and forget)
      if (quality > 0) {
        gamificationService.checkAndIncrementStreak(user.id);
      }

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
      <div className="w-full px-4 md:px-8 py-10 flex flex-col items-center animate-fade-in">
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
    <div className="min-h-screen flex flex-col items-center animate-fade-in relative px-4 py-8 md:py-12 pb-32 md:pb-12 overflow-y-auto overflow-x-hidden">
      {/* Immersive Background Elements */}
      <div className="absolute top-0 left-0 w-full h-screen pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-500/5 blur-[120px] rounded-full animate-float" />
      </div>

      <CompletionCelebration
        show={studyFinished}
        totalCards={totalCards}
        masteredCount={masteredCount}
        onRestart={handleRestartStudy}
        onExit={() => navigate(`/sets/${setId}`)}
      />

      {/* Optimized Header Navigation */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8 relative z-10">
        <div className="flex flex-col gap-2">
          <Button variant="ghost" className="p-0 hover:bg-transparent text-primary font-black text-[10px] tracking-[0.2em] uppercase h-auto group w-fit" asChild>
            <Link to={`/sets/${setId}`} className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-white transition-all">
                <ArrowLeft className="h-3 w-3" />
              </div>
              Exit Session
            </Link>
          </Button>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">
            Active Study <span className="text-primary/40">Mode</span>
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Session Data</span>
            <div className="flex gap-1.5">
              <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-[10px] font-black border border-emerald-500/20">
                {masteredCount} MASTERY
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Progress Layer */}
      <div className="w-full max-w-xl mb-12 relative z-10">
        <StudyProgressBar
          currentIndex={currentCardIndex}
          totalCards={totalCards}
          masteredCount={masteredCount}
          learningCount={learningCount}
        />
      </div>

      {!studyFinished && currentCard ? (
        <div
          className="w-full max-w-xl perspective-2000 touch-pan-y relative z-20"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Card Context Shimmer */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-indigo-500/5 to-primary/10 blur-3xl opacity-50 rounded-[3rem] -z-10 group-hover:opacity-100 transition-opacity duration-1000" />

          <FlippableCard
            key={currentCard.id}
            isFlipped={showDefinition}
            onClick={handleFlipCard}
            className="w-full h-[45vh] min-h-[350px] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
            frontContent={
              <div className="flex flex-col items-center justify-center h-full text-center p-8 relative glass-card rounded-[2.5rem] border-white/40 shadow-premium overflow-hidden">
                {/* Internal Card Branding */}
                <div className="absolute top-8 left-8 flex items-center gap-2 opacity-50">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Curriculum Node</span>
                </div>

                <div className="flex-grow flex flex-col items-center justify-center w-full mt-8">
                  <div className="flex-grow flex items-center justify-center w-full max-h-[70%]">
                    <p className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-tight text-foreground select-none">
                      {currentCard?.term}
                    </p>
                  </div>

                  <div className="pt-8 flex flex-col items-center gap-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative group/audio">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-14 w-14 rounded-2xl transition-all active:scale-90",
                                isPremium
                                  ? "bg-primary/5 text-primary hover:bg-primary hover:text-white shadow-sm"
                                  : "bg-muted text-muted-foreground opacity-70 cursor-not-allowed border border-dashed border-muted-foreground/30"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPremium) {
                                  speak(currentCard.term);
                                } else {
                                  navigate('/pricing');
                                  showError("Advanced Voice is a Nova Pro feature.");
                                }
                              }}
                            >
                              <Volume2 className="h-6 w-6" />
                              {!isPremium && (
                                <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full border-2 border-white dark:border-gray-900 scale-75 shadow-lg">
                                  <Lock className="h-3 w-3" />
                                </div>
                              )}
                            </Button>
                            {!isPremium && (
                              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/audio:opacity-100 transition-opacity whitespace-nowrap">
                                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">NOVA PRO</span>
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        {!isPremium && (
                          <TooltipContent className="bg-amber-500 text-white font-bold border-0 shadow-xl">
                            <p className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4" /> Unlock Advanced Voice with Nova Pro
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <p className="text-[10px] text-muted-foreground font-bold tracking-[0.25em] uppercase animate-pulse">
                      Tap To Reveal Definition
                    </p>
                  </div>
                </div>
              </div>
            }
            backContent={
              <div className="flex flex-col items-center justify-between h-full text-center p-8 glass-card rounded-[2.5rem] border-indigo-100 bg-white/40 shadow-premium overflow-hidden">
                <div className="absolute top-8 left-8 flex items-center gap-2 opacity-50">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Definition Clarity</span>
                </div>

                <div className="flex-grow flex flex-col items-center justify-center w-full mt-12 mb-8 overflow-y-auto custom-scrollbar">
                  <p className="text-lg sm:text-2xl leading-relaxed font-bold text-foreground/90 selection:bg-primary/20">
                    {currentCard?.definition}
                  </p>
                </div>

                <div className="w-full space-y-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "rounded-xl font-bold text-xs gap-2 transition-colors",
                                isPremium
                                  ? "text-muted-foreground hover:text-primary"
                                  : "text-muted-foreground/40 cursor-not-allowed"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPremium) {
                                  speak(currentCard.definition);
                                } else {
                                  navigate('/pricing');
                                  showError("Advanced Voice is a Nova Pro feature.");
                                }
                              }}
                            >
                              <Volume2 className="h-4 w-4" />
                              <span>Listen</span>
                              {!isPremium && <Lock className="h-3 w-3 text-amber-500 ml-1" />}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!isPremium && (
                          <TooltipContent className="bg-amber-500 text-white font-bold border-0">
                            <p>Unlock Advanced Voice with Pro</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            }
          />

          {/* Action Buttons (Rest of DOM) - Only visible when definition is shown */}
          {showDefinition && (
            <div className="grid grid-cols-3 gap-3 w-full mt-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
              <Button
                variant="outline"
                onClick={() => handleNextCard(0)}
                className="group/btn relative overflow-hidden h-14 md:h-16 rounded-2xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 hover:bg-red-500 hover:border-red-500 text-red-600 dark:text-red-400 hover:text-white transition-all duration-300 font-black flex flex-col items-center justify-center shadow-sm"
              >
                <span className="text-sm uppercase tracking-tighter">Again</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleNextCard(1)}
                className="group/btn relative overflow-hidden h-14 md:h-16 rounded-2xl border-2 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-500 hover:border-orange-500 text-orange-600 dark:text-orange-400 hover:text-white transition-all duration-300 font-black flex flex-col items-center justify-center shadow-sm"
              >
                <span className="text-sm uppercase tracking-tighter">Hard</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleNextCard(2)}
                className="group/btn relative overflow-hidden h-14 md:h-16 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-500 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white transition-all duration-300 font-black flex flex-col items-center justify-center shadow-sm"
              >
                <span className="text-sm uppercase tracking-tighter">Good</span>
              </Button>
            </div>
          )}

          {/* Navigation Feedback */}
          <div className="mt-8 flex items-center justify-between px-2">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              Card {currentCardIndex + 1} <span className="mx-2 opacity-30">/</span> {cards.length}
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 opacity-40">
                <div className="px-1.5 py-1 rounded bg-secondary text-[8px] font-black tracking-tighter border border-border/40">SPACE</div>
                <span className="text-[9px] font-bold text-muted-foreground">FLIP</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-40">
                <div className="px-1.5 py-1 rounded bg-secondary text-[8px] font-black tracking-tighter border border-border/40">1-3</div>
                <span className="text-[9px] font-bold text-muted-foreground">GRADE</span>
              </div>
            </div>
          </div>


        </div>
      ) : null}
    </div>
  );
};

export default StudyMode;