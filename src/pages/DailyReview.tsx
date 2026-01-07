import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { NovaSimpleLoader } from "@/components/NovaSimpleLoader";
import { gamificationService } from '@/services/gamificationService';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
// Card components imported below
import FlippableCard from "@/components/FlippableCard";
import { ArrowLeft, RotateCcw, BookOpen, Volume2, Lock, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import { speak } from '@/utils/audio';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/utils/toast';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NovaAI } from '@/utils/NovaAI';
import BrandLogo from '@/components/BrandLogo';

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

const fetchDailyReviewCards = async (hideMastered: boolean, sortOrder: string): Promise<CardItem[]> => {
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

  let filteredCards = data || [];

  if (hideMastered) {
    filteredCards = filteredCards.filter((card: CardItem) => card.status !== 'mastered');
  }

  // Apply sorting based on preference
  if (sortOrder === 'alphabetical_term_asc') {
    filteredCards.sort((a: CardItem, b: CardItem) => a.term.localeCompare(b.term));
  } else if (sortOrder === 'random') {
    filteredCards.sort(() => Math.random() - 0.5);
  } else if (sortOrder === 'created_at_asc') {
    // Assuming 'created_at' is available or can be derived/added to the RPC
    // For now, if not available, this sort might not be perfect.
    // The RPC 'get_daily_review_cards' already sorts by next_review_at, then created_at.
    // If we want true created_at_asc, we'd need to fetch it or modify the RPC.
    // For simplicity, we'll use the default RPC sort if 'created_at' isn't directly in CardItem.
    // If CardItem had created_at, it would be:
    // filteredCards.sort((a: CardItem, b: CardItem) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  // 'next_review_at_asc' is the default RPC sort, so no extra action needed for it here.

  return filteredCards;
};

const DailyReview: React.FC = () => {
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();
  const { isPremium } = useSubscription();
  const navigate = useNavigate();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true); // Start true for "Magic" feel
  const [prepProgress, setPrepProgress] = useState(0);
  const [novaTip, setNovaTip] = useState<string | null>(null);
  const [prepPhase, setPrepPhase] = useState(0); // 0: memory, 1: calibration, 2: ready
  const queryClient = useQueryClient();

  const { data: cards, isLoading, isError, error, refetch } = useQuery<CardItem[], Error>({
    queryKey: ['dailyReviewCards', preferences?.hide_mastered_from_daily_review, preferences?.default_card_sort_order],
    queryFn: async () => {
      // Add a timeout safeguard (10 seconds)
      const timeoutPromise = new Promise<CardItem[]>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 10000)
      );

      try {
        const result = await Promise.race([
          fetchDailyReviewCards(preferences?.hide_mastered_from_daily_review || false, preferences?.default_card_sort_order || 'next_review_at_asc'),
          timeoutPromise
        ]);
        return result;
      } catch (err) {
        console.error("Daily Review fetch failed:", err);
        throw err;
      }
    },
    enabled: !!preferences, // Enable only when preferences are loaded
    staleTime: 0, // Always refetch for a fresh session
    retry: 1, // Only retry once to avoid long waits
  });

  // Prep Transition Logic
  useEffect(() => {
    if (!!preferences && !sessionFinished && currentCardIndex === 0) {
      startPreparation();
    }
  }, [!!preferences]);

  const startPreparation = async () => {
    setPrepProgress(0);
    setPrepPhase(0);

    // Initial Tip (Generic) - will update if cards load fast
    const fetchTip = async (specificTitles?: string) => {
      const prompt = specificTitles ? `I'm about to review cards from these sets: ${specificTitles}. Give me a 1-sentence, high-energy, and professional motivation or memory tip for this session. Keep it under 15 words. Mention Nova by name.` : `I'm starting a study review session. Give me a 1-sentence, high-energy, and professional motivation or memory tip. Keep it under 15 words. Mention Nova by name.`;
      try {
        const tip = await NovaAI.chat(prompt, { route: '/daily-review', userName: 'User', timeOfDay: new Date().getHours() < 12 ? 'morning' : 'afternoon', conversationHistory: [] });
        setNovaTip(tip);
      } catch (e) {
        setNovaTip("Nova is ready for your session.");
      }
    };
    fetchTip();

    // Simulate progress
    const duration = 3500;
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setPrepProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }

        // Update phases based on progress
        if (prev > 75) setPrepPhase(2);
        else if (prev > 45) setPrepPhase(1);

        return prev + increment;
      });
    }, interval);

    setTimeout(() => {
      setIsPreparing(false);
    }, duration);
  };

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

      // Check for streak update (fire and forget)
      if (quality > 0) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) gamificationService.checkAndIncrementStreak(currentUser.id);
      }

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
      setCurrentCardIndex((prevIndex: number) => prevIndex + 1);
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
      <div className="container mx-auto py-6 sm:py-8 md:py-10 flex flex-col items-center animate-fade-in">
        <NovaSimpleLoader message="Nova AI Analyzing" subMessage="Preparing your customized review session..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error loading daily review cards: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center animate-fade-in">
        <Card className="glass-card shadow-premium rounded-[2.5rem] p-8 bg-white/50 dark:bg-black/20 border-white/20">
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
        </Card>
      </div>
    );
  }

  const prepStatusText = [
    "Analyzing memory patterns...",
    "Calibrating neural intensity...",
    "Nova is ready for you."
  ];

  return (
    <div className="w-full px-4 md:px-8 py-6 sm:py-8 md:py-10 flex flex-col items-center animate-fade-in">
      {/* Nova Preparation Overlay */}
      {isPreparing && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center transition-all duration-500">
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
            <BrandLogo size="2xl" glow className="relative animate-float" />
          </div>

          <div className="max-w-md w-full space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary/80 animate-pulse">
                {prepStatusText[prepPhase]}
              </p>

              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
                  style={{ width: `${prepProgress}%` }}
                />
              </div>
            </div>

            <div className={cn(
              "p-6 rounded-3xl bg-white/5 border border-white/10 transition-all duration-700 delay-500",
              novaTip ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Nova's Briefing</span>
              <p className="text-lg font-medium italic text-foreground leading-relaxed">
                "{novaTip || "Preparing your personalized review session..."}"
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Daily Review</h1>
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
        <Card className="glass-card shadow-premium rounded-[2.5rem] w-full max-w-md bg-white/50 dark:bg-black/20 border-white/20 overflow-hidden">
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
        </Card>
      ) : (
        <>
          <FlippableCard
            key={currentCard?.id || 'daily-review-card'}
            isFlipped={showDefinition}
            onClick={handleFlipCard}
            className="w-full max-w-md min-h-[350px] sm:min-h-[400px]"
            frontContent={
              <>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl">Term</CardTitle>
                    {currentCard?.set_title && (
                      <CardDescription className="flex items-center text-sm text-muted-foreground">
                        <BookOpen className="mr-1 h-3 w-3" /> From: {currentCard.set_title}
                      </CardDescription>
                    )}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative group/audio">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-10 w-10 rounded-full transition-all",
                              isPremium
                                ? "hover:bg-primary/10 text-primary"
                                : "text-muted-foreground/40 cursor-not-allowed bg-muted/30"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPremium) {
                                if (currentCard) speak(currentCard.term);
                              } else {
                                navigate('/pricing');
                                showError("Advanced Voice is a Nova Pro feature.");
                              }
                            }}
                          >
                            <Volume2 className="h-5 w-5" />
                            {!isPremium && <Lock className="absolute -top-1 -right-1 h-3 w-3 text-amber-500 shadow-sm" />}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!isPremium && (
                        <TooltipContent className="bg-amber-500 text-white font-bold border-0 shadow-lg">
                          <p className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Unlock Advanced Voice with Nova Pro
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl">Definition</CardTitle>
                    {currentCard?.set_title && (
                      <CardDescription className="flex items-center text-sm text-muted-foreground">
                        <BookOpen className="mr-1 h-3 w-3" /> From: {currentCard.set_title}
                      </CardDescription>
                    )}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative group/audio">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-10 w-10 rounded-full transition-all",
                              isPremium
                                ? "hover:bg-primary/10 text-primary"
                                : "text-muted-foreground/40 cursor-not-allowed bg-muted/30"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPremium) {
                                if (currentCard) speak(currentCard.definition);
                              } else {
                                navigate('/pricing');
                                showError("Advanced Voice is a Nova Pro feature.");
                              }
                            }}
                          >
                            <Volume2 className="h-5 w-5" />
                            {!isPremium && <Lock className="absolute -top-1 -right-1 h-3 w-3 text-amber-500 shadow-sm" />}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!isPremium && (
                        <TooltipContent className="bg-amber-500 text-white font-bold border-0 shadow-lg">
                          <p className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Unlock Advanced Voice with Nova Pro
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
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