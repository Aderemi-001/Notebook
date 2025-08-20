import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, PlayCircle, Pencil, Trash2, CheckCircle2, RotateCcw, Flag, FlagOff, Globe, Plus, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import StudyProgressSummary from '@/components/StudyProgressSummary';
import { isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  user_id: string;
  cards: CardItem[];
  mastered_cards_count: number;
  due_cards_count: number;
}

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

const fetchStudySetDetails = async (setId: string): Promise<StudySet> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const now = new Date();

  const { data, error } = await supabase
    .from('study_sets')
    .select(`
      id,
      title,
      description,
      is_public,
      user_id,
      cards (
        id,
        term,
        definition,
        is_flagged,
        user_progress!user_progress_card_id_fkey!left(
          status,
          user_id,
          next_review_at,
          repetition_level
        )
      )
    `)
    .eq('id', setId)
    .single();

  if (error) {
    console.error("Error fetching study set details:", error);
    throw error;
  }
  if (!data) {
    throw new Error("Study set not found.");
  }

  let masteredCount = 0;
  let dueCount = 0;
  const processedCards: CardItem[] = data.cards.map(card => {
    const progress = card.user_progress?.[0];
    const hasProgress = !!progress && progress.user_id === user.id;
    const cardStatus = hasProgress ? progress.status : 'learning';
    const nextReviewAt = hasProgress ? progress.next_review_at : now.toISOString();

    if (cardStatus === 'mastered') {
      masteredCount++;
    }

    const cardNextReviewDate = new Date(nextReviewAt);
    const isNewCardForCurrentUser = !hasProgress;
    const isDueForReview = cardNextReviewDate <= now;

    if (isNewCardForCurrentUser || (hasProgress && isDueForReview && cardStatus === 'learning')) {
      dueCount++;
    }

    return {
      id: card.id,
      term: card.term,
      definition: card.definition,
      status: cardStatus,
      is_flagged: card.is_flagged,
      next_review_at: nextReviewAt,
      repetition_level: progress?.repetition_level ?? 0,
      has_progress: hasProgress,
    };
  });

  return { ...data, cards: processedCards, mastered_cards_count: masteredCount, due_cards_count: dueCount } as StudySet;
};

const StudySetDetail = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: studySet, isLoading, isError, error } = useQuery<StudySet, Error>({
    queryKey: ['studySet', setId],
    queryFn: () => fetchStudySetDetails(setId!),
    enabled: !!setId,
  });

  const handleDeleteSet = async () => {
    if (!setId) return;

    const toastId = showLoading("Deleting study set...");
    try {
      const { error } = await supabase
        .from('study_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Study set deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
      navigate('/');
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to delete study set.");
      console.error("Delete error:", error);
    }
  };

  const handleResetProgress = async () => {
    if (!setId) return;

    const toastId = showLoading("Resetting progress...");
    try {
      const { data: { user } = { user: null } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated.");
      }

      const { data: cardsInSet, error: fetchCardsError } = await supabase
        .from('cards')
        .select('id')
        .eq('set_id', setId);

      if (fetchCardsError) throw fetchCardsError;

      const cardIds = cardsInSet?.map(card => card.id) || [];

      if (cardIds.length > 0) {
        const { error: deleteProgressError } = await supabase
          .from('user_progress')
          .delete()
          .eq('user_id', user.id)
          .in('card_id', cardIds);

        if (deleteProgressError) throw deleteProgressError;
      }

      dismissToast(toastId);
      showSuccess("Study progress reset successfully!");
      queryClient.invalidateQueries({ queryKey: ['studySet', setId] });
      queryClient.invalidateQueries({ queryKey: ['studyCards', setId] });
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
      window.location.reload();
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to reset progress.");
      console.error("Reset progress error:", error);
    }
  };

  const handleToggleFlag = async (cardId: string, currentFlagStatus: boolean) => {
    const toastId = showLoading(currentFlagStatus ? "Unflagging card..." : "Flagging card...");
    try {
      const { error } = await supabase
        .from('cards')
        .update({ is_flagged: !currentFlagStatus })
        .eq('id', cardId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(currentFlagStatus ? "Card unflagged!" : "Card flagged!");
      queryClient.invalidateQueries({ queryKey: ['studySet', setId] });
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to update flag status.");
      console.error("Flag toggle error:", error);
    }
  };

  const handleAddToMySets = async () => {
    if (!studySet) return;

    const toastId = showLoading(`Adding "${studySet.title}" to your sets...`);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated. Please log in to add sets.");
      }

      const { data: newSet, error: newSetError } = await supabase
        .from('study_sets')
        .insert({
          title: `Copy of ${studySet.title}`,
          description: studySet.description ? `(Copied) ${studySet.description}` : '(Copied from a public set)',
          user_id: user.id,
          is_public: false,
        })
        .select('id')
        .single();

      if (newSetError) throw newSetError;
      if (!newSet) throw new Error("Failed to create new study set.");

      const cardsToInsert = studySet.cards.map(card => ({
        set_id: newSet.id,
        term: card.term,
        definition: card.definition,
        is_flagged: false,
      }));

      if (cardsToInsert.length > 0) {
        const { error: cardsInsertError } = await supabase
          .from('cards')
          .insert(cardsToInsert);
        if (cardsInsertError) throw cardsInsertError;
      }

      dismissToast(toastId);
      showSuccess(`"${studySet.title}" added to your sets!`);
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
      navigate(`/sets/${newSet.id}`);
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to add set to your collection.");
      console.error("Add to my sets error:", error);
    }
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
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-4 w-full mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <NotebookCard key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading study set: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!studySet) {
    return (
      <div className="container mx-auto py-10 text-center">
        Study set not found.
      </div>
    );
  }

  const isOwnerPromise = supabase.auth.getUser().then(({ data: { user } }) => user?.id === studySet.user_id);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    isOwnerPromise.then(ownerStatus => setIsOwner(ownerStatus));
  }, [isOwnerPromise]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">{studySet.title}</h1>
          <Badge variant={studySet.is_public ? "default" : "secondary"} className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {studySet.is_public ? "Public" : "Private"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sets
            </Link>
          </Button>
          {studySet.cards.length > 0 && (
            <Button asChild>
              <Link to={`/sets/${setId}/study`} className="flex items-center">
                <PlayCircle className="mr-2 h-4 w-4" /> Start Study
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to={`/sets/${setId}/edit`} className="flex items-center">
                      <Pencil className="mr-2 h-4 w-4" /> Edit Set
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <AlertDialog>
                      <AlertDialogTrigger className="flex items-center w-full text-left px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                        <RotateCcw className="mr-2 h-4 w-4" /> Reset Progress
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to reset progress?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will permanently delete all your learning progress for this study set. You will start learning all cards from scratch.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleResetProgress}>
                            Reset Progress
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <AlertDialog>
                      <AlertDialogTrigger className="flex items-center w-full text-left px-2 py-1.5 text-sm text-destructive outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Set
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            "{studySet.title}" study set and all its associated cards.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteSet}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuItem>
                </>
              )}
              {studySet.is_public && !isOwner && (
                <DropdownMenuItem onClick={handleAddToMySets} className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" /> Add to My Sets
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {studySet.description && (
        <p className="text-muted-foreground mb-6">{studySet.description}</p>
      )}

      <StudyProgressSummary
        totalCards={studySet.cards.length}
        masteredCardsCount={studySet.mastered_cards_count}
        dueCardsCount={studySet.due_cards_count}
      />

      <h2 className="text-2xl font-semibold mb-4">Cards ({studySet.cards.length})</h2>
      
      {studySet.cards.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No cards in this set yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {studySet.cards.map((card) => (
            <NotebookCard
              key={card.id} 
              className={cn(
                "hover:shadow-md transition-shadow",
                card.is_flagged && "border-yellow-500 border-2",
                card.status === 'mastered' && "border-green-500 border-2",
                card.status === 'learning' && card.has_progress && card.repetition_level === 0 && isPast(new Date(card.next_review_at)) && "border-red-500 border-2",
                card.status === 'learning' && card.has_progress && card.repetition_level === 0 && card.next_review_at && !isPast(new Date(card.next_review_at)) && "border-orange-500 border-2"
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
          ))}
        </div>
      )}
    </div>
  );
};

export default StudySetDetail;