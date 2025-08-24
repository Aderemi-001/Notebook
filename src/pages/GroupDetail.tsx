import * as React from 'react';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, BookOpen, Globe, Folder, PlusCircle, Clock, AlertCircle, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Fixed: Added 'from'
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton'; // Fixed: Added 'from'
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict, isPast } from 'date-fns';
import AddExistingSetToGroupDialog from '@/components/AddExistingSetToGroupDialog';
import { Separator } from '@/components/ui/separator';
import { Label } from "@/components/ui/label";

interface StudySetGroup {
  id: string;
  name: string;
  description: string | null;
}

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  cards_count: number;
  cards: { id: string; term: string; definition: string }[]; // Added cards array
  next_review_at?: string | null;
  due_cards_count?: number;
}

interface UserProgressData {
  card_id: string;
  next_review_at: string;
  status: string;
}

const fetchGroupDetails = async (groupId: string): Promise<StudySetGroup> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('study_set_groups')
    .select('id, name, description')
    .eq('id', groupId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error("Error fetching group details:", error);
    throw new Error("Failed to fetch group details.");
  }
  if (!data) {
    throw new Error("Group not found.");
  }
  return data as StudySetGroup;
};

const fetchStudySetsInGroup = async (groupId: string): Promise<StudySet[]> => {
  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const now = new Date();

  const { data: rawStudySets, error: fetchSetsError } = await supabase
    .from('study_sets')
    .select(`
      id,
      title,
      description,
      is_public,
      cards(id, term, definition)
    `) // Fetch term and definition
    .eq('group_id', groupId)
    .eq('user_id', user.id); // Ensure only user's sets are fetched

  if (fetchSetsError) {
    console.error("Error fetching study sets in group:", fetchSetsError);
    throw new Error("Failed to fetch study sets for this group.");
  }

  const studySets = rawStudySets || [];

  const setsWithReviewData = await Promise.all(studySets.map(async (set: any) => {
    const cardIds = set.cards ? set.cards.map((card: { id: string }) => card.id) : [];

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

      const progressMap = new Map<string, UserProgressData>(progressData?.map((p: UserProgressData) => [p.card_id, p]));

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

    return {
      id: set.id,
      title: set.title,
      description: set.description,
      is_public: set.is_public,
      cards_count: set.cards.length,
      cards: set.cards, // Include full card data
      next_review_at: earliestReviewAt,
      due_cards_count: dueCardsCount,
    };
  }));

  return setsWithReviewData;
};

const GroupDetail: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddSetDialogOpen, setIsAddSetDialogOpen] = useState(false); // New state for dialog

  const { data: group, isLoading: isLoadingGroup, isError: isErrorGroup, error: errorGroup } = useQuery<StudySetGroup, Error>({
    queryKey: ['studySetGroup', groupId],
    queryFn: () => fetchGroupDetails(groupId!),
    enabled: !!groupId,
  });

  const { data: studySets, isLoading: isLoadingSets, isError: isErrorSets, error: errorSets, refetch: refetchStudySetsInGroup } = useQuery<StudySet[], Error>({
    queryKey: ['studySetsInGroup', groupId],
    queryFn: () => fetchStudySetsInGroup(groupId!),
    enabled: !!groupId,
  });

  const filteredStudySets = studySets?.filter((set: StudySet) =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (set.description && set.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!groupId) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        No group ID provided.
      </div>
    );
  }

  if (isLoadingGroup || isLoadingSets) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
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

  if (isErrorGroup) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error loading group details: {errorGroup?.message || "Unknown error"}
      </div>
    );
  }

  if (isErrorSets) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error loading study sets in group: {errorSets?.message || "Unknown error"}
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center animate-fade-in">
        Group not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
          <Folder className="mr-3 h-7 w-7 text-primary" /> {group.name}
        </h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/groups" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Groups
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/groups/${groupId}/edit`} className="flex items-center">
              <Pencil className="mr-2 h-4 w-4" /> Edit Group
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setIsAddSetDialogOpen(true)} className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Existing Set
          </Button>
          <Button asChild>
            <Link to="/create" state={{ groupId: groupId }} className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Set
            </Link>
          </Button>
        </div>
      </div>

      {group.description && (
        <p className="text-muted-foreground mb-6">{group.description}</p>
      )}

      <h2 className="text-2xl font-semibold mb-4">Study Sets in this Group ({filteredStudySets?.length || 0})</h2>
      
      <div className="mb-6">
        <Label htmlFor="search-group-sets" className="sr-only">Search sets in this group</Label>
        <Input
          id="search-group-sets"
          type="text"
          placeholder="Search sets in this group..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {(filteredStudySets?.length === 0 || !filteredStudySets) ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No study sets found in this group!</h2>
          <p className="text-muted-foreground mt-2">
            {searchTerm ? "Try a different search term." : "Create a new study set and assign it to this group, or add an existing one."}
          </p>
          {!searchTerm && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
              <Button asChild>
                <Link to="/create" state={{ groupId: groupId }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Set
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setIsAddSetDialogOpen(true)}> {/* Use state to open dialog */}
                <PlusCircle className="mr-2 h-4 w-4" /> Add Existing Set
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudySets.map((set: StudySet) => (
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

                  {set.cards && set.cards.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <h3 className="text-md font-semibold mb-2">Card Preview:</h3>
                      <div className="space-y-2 text-sm">
                        {set.cards.slice(0, 2).map((card: { id: string; term: string; definition: string }, cardIdx: number) => (
                          <div key={card.id || cardIdx} className="border-l-2 pl-2">
                            <p className="font-medium line-clamp-1">{card.term}</p>
                            <p className="text-muted-foreground line-clamp-1">{card.definition}</p>
                          </div>
                        ))}
                        {set.cards.length > 2 && (
                          <p className="text-muted-foreground text-xs mt-2">
                            ...and {set.cards.length - 2} more cards
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </NotebookCard>
            </Link>
          ))}
        </div>
      )}

      {/* AddExistingSetToGroupDialog rendered outside DropdownMenuContent */}
      <AddExistingSetToGroupDialog
        groupId={groupId!}
        trigger={null}
        onSetAdded={() => refetchStudySetsInGroup()}
        open={isAddSetDialogOpen}
        onOpenChange={setIsAddSetDialogOpen}
      />
    </div>
  );
};

export default GroupDetail;