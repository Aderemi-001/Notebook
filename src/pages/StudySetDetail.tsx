import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Keep these imports for sub-components
import { NotebookCard } from "@/components/NotebookCard"; // Import NotebookCard
import { ArrowLeft, PlayCircle, Pencil, Trash2, CheckCircle2, RotateCcw, Flag, FlagOff } from 'lucide-react'; // Added Flag, FlagOff
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
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { cn } from "@/lib/utils";

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  cards: CardItem[];
  mastered_cards_count?: number;
}

interface CardItem {
  id: string;
  term: string;
  definition: string;
  status?: 'learning' | 'mastered';
  is_flagged?: boolean; // Added is_flagged
}

const fetchStudySetDetails = async (setId: string): Promise<StudySet> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('study_sets')
    .select(`
      id,
      title,
      description,
      cards (
        id,
        term,
        definition,
        is_flagged, // Select is_flagged
        user_progress!left(
          status,
          user_id
        )
      )
    `)
    .eq('id', setId)
    .single();

  if (error) {
    console.error("Error fetching study set details:", error);
    throw new Error("Failed to fetch study set details.");
  }
  if (!data) {
    throw new Error("Study set not found.");
  }

  let masteredCount = 0;
  const processedCards: CardItem[] = data.cards.map(card => {
    const progress = card.user_progress?.[0];
    const cardStatus = (progress && progress.user_id === user.id) ? progress.status : 'learning';
    
    if (cardStatus === 'mastered') {
      masteredCount++;
    }

    return {
      id: card.id,
      term: card.term,
      definition: card.definition,
      status: cardStatus,
      is_flagged: card.is_flagged, // Include is_flagged
    };
  });

  return { ...data, cards: processedCards, mastered_cards_count: masteredCount } as StudySet;
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
      const { data: { user } } = await supabase.auth.getUser();
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
      window.location.reload(); // Refresh the page
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
      queryClient.invalidateQueries({ queryKey: ['studySet', setId] }); // Invalidate to refetch updated flag status
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to update flag status.");
      console.error("Flag toggle error:", error);
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
            <NotebookCard key={i}> {/* Changed to NotebookCard */}
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

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{studySet.title}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/" className="flex items-center">
              <React.Fragment>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sets
              </React.Fragment>
            </Link>
          </Button>
          {studySet.cards.length > 0 && (
            <Button asChild>
              <Link to={`/sets/${setId}/study`} className="flex items-center">
                <React.Fragment>
                  <PlayCircle className="mr-2 h-4 w-4" /> Start Study
                </React.Fragment>
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link to={`/sets/${setId}/edit`} className="flex items-center">
              <React.Fragment>
                <Pencil className="mr-2 h-4 w-4" /> Edit Set
              </React.Fragment>
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <React.Fragment>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset Progress
                </React.Fragment>
              </Button>
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex items-center">
                <React.Fragment>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Set
                </React.Fragment>
              </Button>
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
        </div>
      </div>

      {studySet.description && (
        <p className="text-muted-foreground mb-6">{studySet.description}</p>
      )}

      <h2 className="text-2xl font-semibold mb-4">Cards ({studySet.cards.length})</h2>
      {studySet.cards.length > 0 && studySet.mastered_cards_count !== undefined && (
        <div className="flex items-center text-lg text-muted-foreground mb-4">
          <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
          <span>{studySet.mastered_cards_count} of {studySet.cards.length} cards mastered</span>
        </div>
      )}

      {studySet.cards.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No cards in this set yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {studySet.cards.map((card) => (
            <NotebookCard // Changed to NotebookCard
              key={card.id} 
              className={cn(
                "hover:shadow-md transition-shadow",
                card.status === 'mastered' && "border-green-500 border-2",
                card.is_flagged && "border-yellow-500 border-2" // Highlight flagged cards
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{card.term}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault(); // Prevent navigating to set detail
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