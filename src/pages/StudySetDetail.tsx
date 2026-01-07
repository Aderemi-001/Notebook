import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useState, useEffect } from "react";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Import new modular components
import StudySetHeader from '@/components/StudySetHeader';
import StudyProgressSummary from '@/components/StudyProgressSummary';
import StudySetCardsList from '@/components/StudySetCardsList';
import StudySetLinkedNotes from '@/components/StudySetLinkedNotes';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth

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
  const now = new Date();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user profile to check for admin status
  let isAdmin = false;
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Error fetching user profile for admin check:", profileError);
    }
    isAdmin = profile?.is_admin || false;
  }

  let query = supabase
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
        user_progress!user_progress_card_id_fkey(
          status,
          user_id,
          next_review_at,
          repetition_level
        )
      )
    `)
    .eq('id', setId);

  // If not admin, strictly enforce RLS-like logic:
  // User must own the set OR the set must be public
  if (!isAdmin) {
    query = query.or(`user_id.eq.${user?.id},is_public.eq.true`);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error("Error fetching study set details:", error);
    throw error;
  }
  if (!data) {
    throw new Error("Study set not found or you do not have permission to view it.");
  }

  let masteredCount = 0;
  let dueCount = 0;
  const processedCards: CardItem[] = data.cards.map((card: any) => {
    const progress = card.user_progress?.[0];
    const hasProgress = !!user && !!progress && progress.user_id === user.id;
    const cardStatus = hasProgress ? progress.status : 'learning';
    const nextReviewAt = hasProgress ? progress.next_review_at : now.toISOString();

    if (cardStatus === 'mastered') {
      masteredCount++;
    }

    const cardNextReviewDate = new Date(nextReviewAt);
    const isNewCardForCurrentUser = !!user && !hasProgress; // Only count as new if user is logged in
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
    return []; // No notes for unauthenticated users
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

interface StudySetDetailProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const StudySetDetail = ({ isSidebarOpen, onToggleSidebar }: StudySetDetailProps) => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightTerm = searchParams.get('highlight');
  const queryClient = useQueryClient();
  const { user, profile, loading: isLoadingAuth } = useAuth(); // Use useAuth to get user, profile, and loading state

  const [isOwner, setIsOwner] = useState(false);
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();

  // Edit Card State
  const [editingCard, setEditingCard] = useState<CardItem | null>(null);
  const [editForm, setEditForm] = useState({ term: '', definition: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleEditCard = (card: CardItem) => {
    setEditingCard(card);
    setEditForm({ term: card.term, definition: card.definition });
  };

  const handleSaveCard = async () => {
    if (!editingCard || !user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('cards')
        .update({
          term: editForm.term,
          definition: editForm.definition
        })
        .eq('id', editingCard.id);

      if (error) throw error;

      showSuccess("Card updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['studySet', setId] });
      setEditingCard(null);
    } catch (error: any) {
      showError(error.message || "Failed to update card");
      console.error("Update card error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStudyCard = (cardId: string) => {
    navigate(`/sets/${setId}/study?cardId=${cardId}`);
  };

  const { data: studySet, isLoading, isError, error } = useQuery<StudySet, Error>({
    queryKey: ['studySet', setId, user?.id, profile?.is_admin], // Add profile.is_admin to query key
    queryFn: () => fetchStudySetDetails(setId!),
    enabled: !!setId && !isLoadingAuth, // Enable only when auth state is known
  });

  const { data: linkedNotes, isLoading: isLoadingLinkedNotes } = useQuery<LinkedNote[], Error>({
    queryKey: ['linkedNotes', setId, user?.id],
    queryFn: () => fetchLinkedNotes(setId!),
    enabled: !!setId && !isLoadingAuth && !!user, // Only fetch linked notes if authenticated
  });

  useEffect(() => {
    if (studySet?.user_id && user) {
      setIsOwner(user.id === studySet.user_id);
    } else {
      setIsOwner(false);
    }
  }, [studySet?.user_id, user]);

  // Derived permissions
  const canEdit = isOwner || (profile?.is_admin ?? false);
  const canDelete = isOwner || (profile?.is_admin ?? false);

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
      if (!user) {
        throw new Error("User not authenticated.");
      }

      const { data: cardsInSet, error: fetchCardsError } = await supabase
        .from('cards')
        .select('id')
        .eq('set_id', studySet.id);

      if (fetchCardsError) throw fetchCardsError;

      const cardIds = cardsInSet?.map((card: { id: string }) => card.id) || [];

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
    if (!user) {
      showError("You must be logged in to flag cards.");
      return;
    }
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

    if (!user) {
      showError("Please sign up or log in first to add this set to your collection.");
      navigate('/login'); // Redirect to login page
      return;
    }

    const toastId = showLoading(`Adding "${studySet.title}" to your sets...`);
    try {
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

      const cardsToInsert = studySet.cards.map((card: CardItem) => ({
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
      <div className="container mx-auto py-10 text-center text-red-500 animate-fade-in">
        No study set ID provided.
      </div>
    );
  }

  if (isLoadingAuth || isLoading || isLoadingPreferences || (user && isLoadingLinkedNotes)) {
    return (
      <div className="w-full px-4 md:px-8 py-10 animate-fade-in">
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center text-red-500 animate-fade-in">
        Error loading study set: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!studySet) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center animate-fade-in">
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Study set not found or you do not have permission to view it.</p>
          {!user && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Please log in to view private sets or add public sets to your collection.</p>
              <Button asChild>
                <Link to="/login">Log In / Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-10 min-h-fit animate-fade-in">
      <StudySetHeader
        studySet={studySet}
        isOwner={canEdit} // Pass the computed permission
        isLoggedIn={!!user}
        isAdmin={profile?.is_admin || false}
        preferences={preferences}
        handleDeleteSet={handleDeleteSet}
        handleResetProgress={handleResetProgress}
        handleAddToMySets={handleAddToMySets}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />

      {studySet.description && (
        <p className="text-muted-foreground mb-6">{studySet.description}</p>
      )}

      {user && ( // Only show progress summary if user is logged in
        <StudyProgressSummary
          totalCards={studySet.cards.length}
          masteredCardsCount={studySet.mastered_cards_count}
          dueCardsCount={studySet.due_cards_count}
        />
      )}

      <StudySetCardsList
        cards={studySet.cards}
        handleToggleFlag={handleToggleFlag}
        onEditCard={canEdit ? handleEditCard : undefined} // Use computed permission
        onStudyCard={handleStudyCard}
        highlightTerm={highlightTerm}
      />

      {user && ( // Only show linked notes if user is logged in
        <StudySetLinkedNotes
          linkedNotes={linkedNotes}
          isLoadingLinkedNotes={isLoadingLinkedNotes}
        />
      )}

      {/* Edit Card Dialog */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="term">Term</Label>
              <Textarea
                id="term"
                value={editForm.term}
                onChange={(e) => setEditForm(prev => ({ ...prev, term: e.target.value }))}
                placeholder="Enter term"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="definition">Definition</Label>
              <Textarea
                id="definition"
                value={editForm.definition}
                onChange={(e) => setEditForm(prev => ({ ...prev, definition: e.target.value }))}
                placeholder="Enter definition"
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCard(null)}>Cancel</Button>
            <Button onClick={handleSaveCard} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudySetDetail;