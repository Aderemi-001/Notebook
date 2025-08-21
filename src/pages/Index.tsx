import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { PlusCircle, BookOpen, User, Clock, AlertCircle, Network, Globe, Menu, Brain, CalendarCheck, FileText, History, LogOut, NotebookText, Folder, Users } from "lucide-react"; // Added NotebookText, Folder, Users
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { formatDistanceToNowStrict, isPast } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  cards_count: number;
  next_review_at?: string | null;
  due_cards_count?: number;
}

interface SearchResultCard {
  card_id: string;
  term: string;
  definition: string;
  set_id: string;
  set_title: string;
}

const fetchStudySets = async (): Promise<StudySet[]> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const now = new Date();

  const { data: rawStudySets, error: rpcError } = await supabase
    .rpc('get_study_sets_with_card_count');

  if (rpcError) {
    console.error("Error fetching study sets from RPC:", rpcError);
    throw new Error("Failed to fetch study sets.");
  }

  const studySets = rawStudySets || [];

  const setsWithReviewData = await Promise.all(studySets.map(async (set) => {
    const { data: cardsData, error: cardsError } = await supabase
      .from('cards')
      .select('id')
      .eq('set_id', set.id);

    if (cardsError) {
      console.error(`Error fetching cards for set ${set.id}:`, cardsError);
      return { ...set, next_review_at: null, due_cards_count: 0 };
    }

    const cardIds = cardsData ? cardsData.map(card => card.id) : [];

    let earliestReviewAt: string | null = null;
    let dueCardsCount = 0;

    if (cardIds.length > 0) {
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('card_id, next_review_at, status')
        .eq('user_id', user.id)
        .in('card_id', cardIds);

      if (progressError && progressError.code !== 'PGRST116') {
        console.error(`Error fetching progress for set ${set.id}:`, progressError);
      }

      const progressMap = new Map(progressData?.map(p => [p.card_id, p]));

      let tempEarliestReviewAt: Date | null = null;

      for (const cardId of cardIds) {
        const progress = progressMap.get(cardId);
        
        if (!progress) {
          dueCardsCount++;
          if (!tempEarliestReviewAt || now < tempEarliestReviewAt) {
            tempEarliestReviewAt = now;
          }
        } else {
          const cardNextReviewDate = new Date(progress.next_review_at);
          if (cardNextReviewDate <= now && progress.status === 'learning') {
            dueCardsCount++;
          }
          
          if (!tempEarliestReviewAt || cardNextReviewDate < tempEarliestReviewAt) {
            tempEarliestReviewAt = cardNextReviewDate;
          }
        }
      }
      if (tempEarliestReviewAt) {
        earliestReviewAt = tempEarliestReviewAt.toISOString();
      }
    }

    // Fetch is_public status for the set
    const { data: setPublicStatus, error: publicStatusError } = await supabase
      .from('study_sets')
      .select('is_public')
      .eq('id', set.id)
      .single();

    if (publicStatusError) {
      console.error(`Error fetching public status for set ${set.id}:`, publicStatusError);
    }

    return {
      ...set,
      is_public: setPublicStatus?.is_public ?? false, // Default to false if not found
      next_review_at: earliestReviewAt,
      due_cards_count: dueCardsCount,
    };
  }));

  return setsWithReviewData;
};

const fetchSearchResults = async (searchTerm: string): Promise<SearchResultCard[]> => {
  if (!searchTerm.trim()) {
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .rpc('search_user_cards', { search_query: searchTerm });

  if (error) {
    console.error("Error searching cards:", error);
    throw new Error("Failed to search cards.");
  }
  return data || [];
};

const Index = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce the search term to avoid excessive API calls
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  const { data: studySets, isLoading: isLoadingStudySets, isError: isErrorStudySets, error: errorStudySets } = useQuery<StudySet[], Error>({
    queryKey: ['studySets'],
    queryFn: fetchStudySets,
  });

  const { data: searchResults, isLoading: isLoadingSearchResults, isError: isErrorSearchResults, error: errorSearchResults } = useQuery<SearchResultCard[], Error>({
    queryKey: ['searchCards', debouncedSearchTerm],
    queryFn: () => fetchSearchResults(debouncedSearchTerm),
    enabled: !!debouncedSearchTerm.trim(), // Only run query if debouncedSearchTerm is not empty
  });

  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['studySets'] });
  }, [queryClient]);

  const filteredStudySets = studySets?.filter(set =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (set.description && set.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSignOut = async () => {
    const toastId = showLoading('Signing out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      dismissToast(toastId);
      showSuccess('Signed out successfully!');
      queryClient.clear();
      // AuthLayout will handle redirect to /login
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || 'Failed to sign out.');
      console.error('Sign out error:', err);
    }
  };

  if (isErrorStudySets) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading study sets: {errorStudySets?.message || "Unknown error"}
      </div>
    );
  }

  if (isErrorSearchResults && debouncedSearchTerm.trim()) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error searching cards: {errorSearchResults?.message || "Unknown error"}
      </div>
    );
  }

  const showSearchResults = debouncedSearchTerm.trim() && (isLoadingSearchResults || (searchResults && searchResults.length > 0) || (searchResults && searchResults.length === 0));

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Study Sets</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Daily Review */}
            <DropdownMenuItem asChild>
              <Link to="/daily-review" className="flex items-center">
                <CalendarCheck className="mr-2 h-4 w-4" /> Daily Review
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* Study Set Management */}
            <DropdownMenuItem asChild>
              <Link to="/" className="flex items-center">
                <BookOpen className="mr-2 h-4 w-4" /> My Study Sets
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/create" className="flex items-center">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Set
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/explore-public-sets" className="flex items-center">
                <Globe className="mr-2 h-4 w-4" /> Explore Public Sets
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* AI Tools & Practice */}
            <DropdownMenuItem asChild>
              <Link to="/generate-exam" className="flex items-center">
                <Brain className="mr-2 h-4 w-4" /> Generate Exam
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/generate-essay-questions" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" /> Generate Essay Questions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/constellation" className="flex items-center">
                <Network className="mr-2 h-4 w-4" /> Cognitive Constellation
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* History & Review */}
            <DropdownMenuItem asChild>
              <Link to="/past-exams" className="flex items-center">
                <History className="mr-2 h-4 w-4" /> Past Exams
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/past-essay-questions" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" /> Past Essay Questions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* Content & Organization */}
            <DropdownMenuItem asChild>
              <Link to="/notes" className="flex items-center">
                <NotebookText className="mr-2 h-4 w-4" /> My Notes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/groups" className="flex items-center">
                <Folder className="mr-2 h-4 w-4" /> My Groups
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/collaborations" className="flex items-center">
                <Users className="mr-2 h-4 w-4" /> Collaborations
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* Account & App */}
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="flex items-center text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search sets by title/description or cards by term/definition..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {showSearchResults ? (
        <>
          <h2 className="text-2xl font-semibold mb-4">Card Search Results</h2>
          {isLoadingSearchResults ? (
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
          ) : searchResults?.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <h2 className="text-xl font-semibold">No cards found for "{debouncedSearchTerm}"</h2>
              <p className="text-muted-foreground mt-2">
                Try a different search term.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {searchResults?.map((card) => (
                <Link to={`/sets/${card.set_id}`} key={card.card_id}>
                  <NotebookCard className="hover:shadow-md transition-shadow h-full">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">{card.term}</CardTitle>
                      <CardDescription>{card.definition}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>From Set: {card.set_title}</span>
                      </div>
                    </CardContent>
                  </NotebookCard>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <h2 className="text-2xl font-semibold mb-4">My Study Sets</h2>
          {isLoadingStudySets ? (
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
          ) : (filteredStudySets?.length === 0 || !filteredStudySets) ? (
            <div className="text-center py-20 border-2 border-dashed rounded-lg">
              <h2 className="text-xl font-semibold">No study sets found!</h2>
              <p className="text-muted-foreground mt-2">
                {searchTerm ? "Try a different search term or " : ""}Click "Create Set" to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStudySets.map((set) => (
                <Link to={`/sets/${set.id}`} key={set.id}>
                  <NotebookCard className="hover:shadow-md transition-shadow h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-semibold">{set.title}</CardTitle>
                      <Badge variant={set.is_public ? "default" : "secondary"} className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {set.is_public ? "Public" : "Private"}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      {set.description && (
                        <CardDescription>{set.description}</CardDescription>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground mt-2">
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>{set.cards_count} cards</span>
                      </div>
                      {set.due_cards_count !== undefined && set.due_cards_count > 0 && (
                        <div className="flex items-center text-sm text-red-500 mt-2">
                          <AlertCircle className="mr-2 h-4 w-4" />
                          <span>{set.due_cards_count} cards due for review</span>
                        </div>
                      )}
                      {set.next_review_at && (
                        <div className="flex items-center text-sm text-muted-foreground mt-2">
                          <Clock className="mr-2 h-4 w-4" />
                          <span className={isPast(new Date(set.next_review_at)) ? 'text-red-500' : ''}>
                            {isPast(new Date(set.next_review_at)) ? 'Due now' : `Next review ${formatDistanceToNowStrict(new Date(set.next_review_at), { addSuffix: true })}`}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </NotebookCard>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Index;