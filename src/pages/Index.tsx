import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"; // Keep these imports for sub-components
import { NotebookCard } from "@/components/NotebookCard"; // Import NotebookCard
import { PlusCircle, BookOpen, User, Clock, AlertCircle, Network, Globe } from "lucide-react"; // Added Network icon, Globe
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { formatDistanceToNowStrict, isPast } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge"; // Import Badge

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean; // Added is_public
  cards_count: number;
  next_review_at?: string | null;
  due_cards_count?: number;
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

const Index = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: studySets, isLoading, isError, error } = useQuery<StudySet[], Error>({
    queryKey: ['studySets'],
    queryFn: fetchStudySets,
  });

  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['studySets'] });
  }, [queryClient]);

  const filteredStudySets = studySets?.filter(set =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (set.description && set.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading study sets: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Study Sets</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/create" className="flex items-center">
              <React.Fragment>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Set
              </React.Fragment>
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/constellation" className="flex items-center">
              <React.Fragment>
                <Network className="mr-2 h-4 w-4" /> Constellation
              </React.Fragment>
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/profile" className="flex items-center">
              <React.Fragment>
                <User className="mr-2 h-4 w-4" /> Profile
              </React.Fragment>
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search study sets by title or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {isLoading ? (
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
              <NotebookCard className="hover:shadow-md transition-shadow h-full"> {/* Changed to NotebookCard */}
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
    </div>
  );
};

export default Index;