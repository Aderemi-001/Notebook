import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import React, { useState, useEffect } from "react";

// Import new modular components
import StudySetHeader from '@/components/StudySetHeader';
import StudyProgressSummary from '@/components/StudyProgressSummary';
import StudySetCardsList from '@/components/StudySetCardsList';
import StudySetLinkedNotes from '@/components/StudySetLinkedNotes';
import { useUserPreferences } from '@/hooks/use-user-preferences';

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  user_id: string;
  group_id: string | null;
  study_set_groups: { name: string }[] | null;
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

interface LinkedNote {
  id: string;
  title: string;
  updated_at: string;
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
      group_id,
      study_set_groups (name),
      cards (
        id,
        term,
        definition,
        is_flagged,
        user_progress(
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
  const processedCards: CardItem[] = data.cards.map((card: any) => {
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

const fetchLinkedNotes = async (setId: string): Promise<LinkedNote[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('notes')
    .select('id, title, updated_at')
    .eq('study_set_id', setId)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching linked notes:", error);
    throw new Error("Failed to fetch linked notes.");
  }
  return data || [];
};

const StudySetDetail = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isOwner, setIsOwner] = useState(false);
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();

  const { data: studySet, isLoading, isError, error } = useQuery<StudySet, Error>({
    queryKey: ['studySet', setId],
    queryFn: () => fetchStudySetDetails(setId!),
    enabled: !!setId,
  });

  const { data: linkedNotes, isLoading: isLoadingLinkedNotes } = useQuery<LinkedNote[], Error>({
    queryKey: ['linkedNotes', setId],
    queryFn: () => fetchLinkedNotes(setId!),
    enabled: !!setId,
  });

  useEffect(() => {
    const checkOwner = async () => {
      if (studySet?.user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        setIsOwner(user?.id === studySet.user_id);
      }
    };
    checkOwner();
  }, [studySet?.user_id]);

  const handleDeleteSet = async () => {
    if (!studySet?.id) return;

    const toastId = showLoading("Deleting study set...");
    try {
      const { error } = await supabase
        .from('study_sets')
        .delete()
        .eq('id', studySet.id);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess("Study set deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
      queryClient.invalidateQueries({ queryKey: ['linkedNotes', studySet.id] });
      queryClient.invalidateQueries({ queryKey: ['studySetGroups'] });
      navigate('/');
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message || "Failed to delete study set.");
      console.error("Delete error:", error);
    }
  };

  const handleResetProgress = async () => {
    if (!studySet?.id) return;

    const toastId = showLoading("Resetting progress...");
    try {
      const { data: { user } = { user: null } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated.");
      }

      const { data: cardsInSet, error: fetchCardsError } = await supabase
        .from('cards')
        .select('id')
        .eq('set_id', studySet.id);

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
      queryClient.invalidateQueries({ queryKey: ['studySet', studySet.id] });
      queryClient.invalidateQueries({ queryKey: ['studyCards', studySet.id] });
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
      queryClient.invalidateQueries({ queryKey: ['studySet', studySet?.id] });
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

  if (isLoading || isLoadingPreferences || isLoadingLinkedNotes) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-4 w-full mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
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
      <StudySetHeader
        studySet={studySet}
        isOwner={isOwner}
        preferences={preferences}
        handleDeleteSet={handleDeleteSet}
        handleResetProgress={handleResetProgress}
        handleAddToMySets={handleAddToMySets}
      />

      {studySet.description && (
        <p className="text-muted-foreground mb-6">{studySet.description}</p>
      )}

      <StudyProgressSummary
        totalCards={studySet.cards.length}
        masteredCardsCount={studySet.mastered_cards_count}
        dueCardsCount={studySet.due_cards_count}
      />

      <StudySetCardsList
        cards={studySet.cards}
        handleToggleFlag={handleToggleFlag}
      />

      <StudySetLinkedNotes
        linkedNotes={linkedNotes}
        isLoadingLinkedNotes={isLoadingLinkedNotes}
      />
    </div>
  );
};

export default StudySetDetail;