import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { shuffleArray } from '@/utils/shuffle';
import {
  ArrowLeft,
  RotateCcw,
  Volume2,
  Sparkles,
  CheckCircle2,
  Lock as LockIcon
} from 'lucide-react';
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import FlippableCard from "@/components/FlippableCard";
import { NovaSimpleLoader } from "@/components/NovaSimpleLoader";

import { gamificationService } from '@/services/gamificationService';
import { studySetService } from '@/services/studySetService';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useSubscription } from '@/hooks/useSubscription';
import { showError } from '@/utils/toast';
import { speak } from '@/utils/audio';
import { calculateNextReview } from '@/utils/srs';

// --- Types ---
type SessionPhase = 'SETUP' | 'PREPARING' | 'REVIEW' | 'COMPLETE';

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

// --- Helper for fetching cards ---
const fetchDailyReviewCards = async (hideMastered: boolean, sortOrder: string, selectedSetIds: string[] | null, limit: number): Promise<CardItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated.");

  const { data, error } = await supabase
    .rpc('get_daily_review_cards', {
      p_user_id: user.id,
      p_set_ids: selectedSetIds && selectedSetIds.length > 0 ? selectedSetIds : null
    });

  if (error) {
    throw error;
  }

  let allCards: CardItem[] = (data || []).map((card: any) => ({
    ...card,
    status: (card.status === 'mastered' ? 'mastered' : 'learning') as 'learning' | 'mastered'
  }));

  if (hideMastered) {
    allCards = allCards.filter((card: CardItem) => card.status !== 'mastered');
  }

  // Interleaving Logic: If multiple sets, ensure a mix
  if (selectedSetIds && selectedSetIds.length > 1) {
    const cardsBySet = new Map<string, CardItem[]>();
    selectedSetIds.forEach(id => cardsBySet.set(id, []));

    allCards.forEach(card => {
      if (cardsBySet.has(card.set_id)) {
        cardsBySet.get(card.set_id)?.push(card);
      }
    });

    // Shuffle each set's individual cards if random order
    if (sortOrder === 'random') {
      cardsBySet.forEach((cards, key) => cardsBySet.set(key, shuffleArray(cards)));
    }

    const mixedCards: CardItem[] = [];
    let hasMore = true;
    let pass = 0;

    while (hasMore && mixedCards.length < allCards.length) {
      hasMore = false;
      for (const setId of selectedSetIds) {
        const setCards = cardsBySet.get(setId);
        if (setCards && setCards[pass]) {
          mixedCards.push(setCards[pass]);
          hasMore = true;
        }
      }
      pass++;
    }
    allCards = mixedCards;
  } else {
    // Basic sorting for single set or no set selection
    if (sortOrder === 'alphabetical_term_asc') {
      allCards.sort((a, b) => a.term.localeCompare(b.term));
    } else if (sortOrder === 'random') {
      allCards = shuffleArray(allCards);
    }
  }

  if (limit > 0) {
    allCards = allCards.slice(0, limit);
  }

  return allCards;
};

// --- Sub-Components ---

const SetupView = ({
  onStart,
  isLoading,
  initialSelection
}: {
  onStart: (selectedIds: string[]) => void;
  isLoading: boolean;
  initialSelection: string[];
}) => {
  const navigate = useNavigate();
  const { data: studySets } = useQuery({
    queryKey: ['myStudySets'],
    queryFn: studySetService.getMyStudySets,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection);

  useEffect(() => {
    if (initialSelection.length > 0 && selectedIds.length === 0) {
      setSelectedIds(initialSelection);
    }
  }, [initialSelection]);

  const toggleSet = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => studySets && setSelectedIds(studySets.map(s => s.id));
  const clearAll = () => setSelectedIds([]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <NovaSimpleLoader message="Nova AI" subMessage="Initializing review module..." />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="container mx-auto py-8 px-4 max-w-2xl"
    >
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Nova Review Setup
        </h1>
      </div>

      <Card className="glass-card shadow-lg border-indigo-500/20">
        <CardHeader>
          <CardTitle>Customize Your Session</CardTitle>
          <CardDescription>
            Select specific sets to focus on, or let Nova review everything due.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">Select All</Button>
            <Button variant="outline" size="sm" onClick={clearAll} className="text-xs">Clear</Button>
          </div>

          <ScrollArea className="h-[40vh] rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="space-y-3">
              {studySets && studySets.length > 0 ? (
                studySets.map(set => (
                  <div
                    key={set.id}
                    className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    onClick={() => toggleSet(set.id)}
                  >
                    <Checkbox checked={selectedIds.includes(set.id)} onCheckedChange={() => toggleSet(set.id)} />
                    <div className="flex-1">
                      <p className="text-sm font-bold">{set.title}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{set.cards_count || 0} Cards</p>
                    </div>
                    {selectedIds.includes(set.id) && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No study sets found.</p>
              )}
            </div>
          </ScrollArea>

          <Button
            size="lg"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20"
            onClick={() => onStart(selectedIds)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Start Nova Review
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const PreparationView = ({ onReady }: { onReady: () => void }) => {
  const [tip, setTip] = useState("Analyzing your memory retention...");

  useEffect(() => {
    const timer = setTimeout(() => {
      onReady();
    }, 2500);

    const tips = [
      "Spacing your reviews is key to long-term retention.",
      "Active recall strengthens neural pathways.",
      "Consistency beats intensity. Keep up the streak!",
      "Reviewing before sleep improves consolidation."
    ];
    setTip(tips[Math.floor(Math.random() * tips.length)]);

    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <NovaSimpleLoader message="Nova AI" subMessage={tip} />
    </div>
  );
};

const ReviewSession = ({
  card,
  index,
  total,
  onNext,
  onExit,
  isPremium,
  autoVoice
}: {
  card: CardItem;
  index: number;
  total: number;
  onNext: (quality: 0 | 1 | 2) => void;
  onExit: () => void;
  isPremium: boolean;
  autoVoice?: boolean;
}) => {
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    setFlipped(false);

    // Auto Voice trigger
    if (autoVoice && isPremium && card) {
      setTimeout(() => {
        speak(card.term);
      }, 500);
    }
  }, [card.id, autoVoice, isPremium]);

  const handleSpeak = (text: string) => {
    if (isPremium) {
      speak(text);
    } else {
      showError("Advanced Voice is a Nova Pro feature.");
      navigate('/pricing');
    }
  };

  return (
    <motion.div
      key="review-session"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full px-4 md:px-8 py-6 flex flex-col items-center min-h-screen relative"
    >
      {/* Immersive Background Elements */}
      <div className="absolute top-0 left-0 w-full h-screen pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-500/5 blur-[120px] rounded-full animate-float" />
      </div>

      <div className="w-full max-w-4xl flex items-center justify-between mb-8 relative z-10">
        <div className="flex flex-col gap-2">
          <Button variant="ghost" className="p-0 hover:bg-transparent text-primary font-black text-[10px] tracking-[0.2em] uppercase h-auto group w-fit" onClick={onExit}>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-white transition-all">
                <ArrowLeft className="h-3 w-3" />
              </div>
              Exit Session
            </div>
          </Button>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground">
            Daily Review <span className="text-primary/40">Active</span>
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Session Data</span>
            <div className="flex gap-1.5">
              <div className="px-3 py-1 bg-indigo-500/10 text-indigo-600 rounded-lg text-[10px] font-black border border-indigo-500/20">
                {card.set_title}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-xl mb-12 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Session Progress</span>
          <span className="text-[10px] font-black text-primary">{t('study.card') || 'Card'} {index + 1} / {total}</span>
        </div>
        <Progress value={((index) / total) * 100} className="h-2 rounded-full overflow-hidden bg-secondary border border-border/40" />
      </div>

      <div className="w-full max-w-xl perspective-2000 touch-pan-y relative z-20">
        {/* Card Context Shimmer */}
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-indigo-500/5 to-primary/10 blur-3xl opacity-50 rounded-[3rem] -z-10 group-hover:opacity-100 transition-opacity duration-1000" />

        <FlippableCard
          isFlipped={flipped}
          onClick={() => setFlipped(!flipped)}
          className="w-full h-[45vh] min-h-[350px] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
          frontContent={
            <div className="flex flex-col items-center justify-center h-full text-center p-8 relative rounded-[2.5rem] overflow-hidden">
              <div className="absolute top-8 left-8 flex items-center gap-2 opacity-50">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Curriculum Node</span>
              </div>

              <div className="flex-grow flex flex-col items-center justify-center w-full mt-8">
                <div className="flex-grow flex items-center justify-center w-full max-h-[70%]">
                  <p className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-tight text-foreground select-none">
                    {card.term}
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
                              handleSpeak(card.term);
                            }}
                          >
                            <Volume2 className="h-6 w-6" />
                            {!isPremium && (
                              <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full border-2 border-white dark:border-gray-900 scale-75 shadow-lg">
                                <LockIcon className="h-3 w-3" />
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
                    {t('study.tapToReveal') || 'Tap To Reveal Definition'}
                  </p>
                </div>
              </div>
            </div>
          }
          backContent={
            <div className="flex flex-col h-full text-center p-6 rounded-[2.5rem] overflow-hidden">
              <div className="absolute top-6 left-6 flex items-center gap-2 opacity-50">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Definition Clarity</span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center w-full mt-8 mb-4 overflow-y-auto custom-scrollbar px-2">
                <p className="text-lg sm:text-2xl leading-relaxed font-bold text-foreground/90 selection:bg-primary/20">
                  {card.definition}
                </p>
              </div>

              <div className="w-full space-y-6 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
                              handleSpeak(card.definition);
                            }}
                          >
                            <Volume2 className="h-4 w-4" />
                            <span>{t('study.listen') || 'Listen'}</span>
                            {!isPremium && <LockIcon className="h-3 w-3 text-amber-500 ml-1" />}
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
                <p className="text-[10px] text-muted-foreground font-bold tracking-[0.25em] uppercase">
                  Rate Your Retention
                </p>
              </div>
            </div>
          }
        />

        {/* Action Buttons */}
        <div className="w-full mt-6">
          {!flipped ? (
            <Button
              onClick={() => setFlipped(true)}
              className="w-full h-14 md:h-16 rounded-2xl bg-primary text-white font-black text-lg shadow-premium hover:shadow-premium-hover transition-all active:scale-[0.98]"
            >
              {t('study.flip') || 'Flip Card'}
            </Button>
          ) : (
            <div className="grid grid-cols-3 gap-3 w-full animate-in slide-in-from-bottom-4 duration-500 fade-in">
              <Button
                variant="outline"
                onClick={() => onNext(0)}
                className="group/btn relative overflow-hidden h-14 md:h-16 rounded-2xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 hover:bg-red-500 hover:border-red-500 text-red-600 dark:text-red-400 hover:text-white transition-all duration-300 font-black flex flex-col items-center justify-center shadow-sm"
              >
                <span className="text-sm uppercase tracking-tighter">{t('study.dontKnowIt') || "Don't Know It"}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => onNext(1)}
                className="group/btn relative overflow-hidden h-14 md:h-16 rounded-2xl border-2 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-500 hover:border-orange-500 text-orange-600 dark:text-orange-400 hover:text-white transition-all duration-300 font-black flex flex-col items-center justify-center shadow-sm"
              >
                <span className="text-sm uppercase tracking-tighter">{t('study.previous') || 'Previous'}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => onNext(2)}
                className="group/btn relative overflow-hidden h-14 md:h-16 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-500 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white transition-all duration-300 font-black flex flex-col items-center justify-center shadow-sm"
              >
                <span className="text-sm uppercase tracking-tighter">{t('study.knowIt') || 'Know It'}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const SummaryView = ({ onRestart, onExit }: { onRestart: () => void; onExit: () => void }) => (
  <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="container mx-auto py-10 flex flex-col items-center justify-center min-h-[60vh]"
  >
    <Card className="glass-card shadow-premium rounded-[2.5rem] w-full max-w-md bg-white/50 dark:bg-black/20 border-white/20 p-6 text-center">
      <div className="mb-6 flex justify-center">
        <div className="p-4 bg-green-500/10 rounded-full">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
      </div>
      <CardHeader>
        <CardTitle className="text-3xl">Session Complete!</CardTitle>
        <CardDescription>You've reviewed all scheduled cards. Great neural strengthening!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={onRestart} className="w-full" size="lg">
          <RotateCcw className="mr-2 h-4 w-4" /> Start New Session
        </Button>
        <Button variant="outline" onClick={onExit} className="w-full" size="lg">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  </motion.div>
);

export default function DailyReviewSession() {
  const [phase, setPhase] = useState<SessionPhase>('SETUP');
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [totalCardsAvailable, setTotalCardsAvailable] = useState(0);

  const { preferences, isLoading: isLoadingPrefs } = useUserPreferences();
  const { isPremium } = useSubscription();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleStartSession = async (ids: string[]) => {
    setSelectedSetIds(ids);
    setPhase('PREPARING');

    try {
      // Determine the limit: Preference -> Tier Default
      const userGoal = preferences?.daily_cards_goal || 0;
      const tierLimit = isPremium ? 100 : 10;
      const activeLimit = userGoal > 0 ? Math.min(userGoal, tierLimit) : tierLimit;

      const fetchedCards = await fetchDailyReviewCards(
        preferences?.hide_mastered_from_daily_review || false,
        preferences?.default_card_sort_order || 'next_review_at_asc',
        ids,
        activeLimit
      );

      setTotalCardsAvailable(fetchedCards.length);

      if (fetchedCards.length > activeLimit) {
        setCards(fetchedCards.slice(0, activeLimit));
        if (!isPremium && fetchedCards.length > 10) {
          setShowLimitDialog(true);
        }
      } else {
        setCards(fetchedCards);
      }

      if (fetchedCards.length === 0) {
        showError("No due cards found for selected sets.");
        setPhase('SETUP');
      } else {
        setPhase('REVIEW');
      }
    } catch (err: any) {
      showError("Failed to load cards: " + err.message);
      setPhase('SETUP');
    }
  };

  const handlePreparationComplete = () => {
    if (cards.length > 0) {
      setPhase('REVIEW');
    } else {
      showError("No cards available.");
      setPhase('SETUP');
    }
  };

  const handleCardResult = async (quality: 0 | 1 | 2) => {
    const card = cards[currentIndex];
    if (!card) return;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data: currentProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('card_id', card.id)
        .maybeSingle();

      const next = calculateNextReview(currentProgress as any, quality);

      await supabase.from('user_progress').upsert({
        user_id: user.id,
        card_id: card.id,
        ...next
      });

      if (quality > 0) gamificationService.checkAndIncrementStreak(user.id);

      queryClient.invalidateQueries({ queryKey: ['dueCardsCount'] });

      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setPhase('COMPLETE');
      }
    } catch (err) {
      console.error(err);
      showError("Failed to save progress");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnimatePresence mode="wait">
        {phase === 'SETUP' && (
          <SetupView
            key="setup"
            onStart={handleStartSession}
            isLoading={isLoadingPrefs}
            initialSelection={selectedSetIds}
          />
        )}
        {phase === 'PREPARING' && (
          <PreparationView onReady={handlePreparationComplete} />
        )}
        {phase === 'REVIEW' && cards[currentIndex] && (
          <ReviewSession
            key={`review-${cards[currentIndex].id}`}
            card={cards[currentIndex]}
            index={currentIndex}
            total={cards.length}
            onNext={handleCardResult}
            onExit={() => setPhase('SETUP')}
            isPremium={isPremium}
            autoVoice={preferences?.enable_tts}
          />
        )}
        {phase === 'COMPLETE' && (
          <SummaryView key="summary" onRestart={() => {
            setPhase('SETUP');
            setCurrentIndex(0);
          }} onExit={() => navigate('/')} />
        )}
      </AnimatePresence>

      <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent className="rounded-[2.5rem] border-indigo-500/20 shadow-2xl overflow-hidden glass-card">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-500" />
              Free Plan Limit Reached
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg font-medium leading-relaxed pt-2">
              You have {totalCardsAvailable} cards due for review, but the free plan is limited to 10 cards per session.
              Upgrade to Pro to review all your cards without limits!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel
              className="rounded-xl font-bold py-6"
              onClick={() => {
                setShowLimitDialog(false);
                navigate('/');
              }}
            >
              Back to Dashboard
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl font-bold py-6 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                setShowLimitDialog(false);
                setPhase('REVIEW');
              }}
            >
              Continue with 10 Cards
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}