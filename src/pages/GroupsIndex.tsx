import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, PlusCircle, Folder, Menu, Pencil, Trash2, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // Added
} from "@/components/ui/alert-dialog";
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Separator } from '@/components/ui/separator';
import { Label } from "@/components/ui/label";

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  cards: { id: string; term: string; definition: string }[];
  cards_count: number;
}

interface StudySetGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  study_sets: StudySet[]; // Nested study sets for preview
}

const fetchStudySetGroups = async (): Promise<StudySetGroup[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  // Fetch groups
  const { data: groupsData, error: groupsError } = await supabase
    .from('study_set_groups')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (groupsError) {
    console.error("Error fetching study set groups:", groupsError);
    throw new Error("Failed to fetch your study set groups.");
  }

  // Fetch all study sets for the user, including their cards
  const { data: setsData, error: setsError } = await supabase
    .from('study_sets')
    .select(`
      id,
      title,
      description,
      is_public,
      group_id,
      cards(id, term, definition)
    `) // Fetch term and definition
    .eq('user_id', user.id);

  if (setsError) {
    console.error("Error fetching study sets:", setsError);
    throw new Error("Failed to fetch study sets for groups.");
  }

  // Map sets to their respective groups
  const setsMap = new Map<string, StudySet[]>();
  setsData?.forEach((set: any) => {
    if (set.group_id) {
      const processedSet: StudySet = {
        id: set.id,
        title: set.title,
        description: set.description,
        is_public: set.is_public,
        cards: set.cards || [],
        cards_count: set.cards?.length || 0,
      };
      if (!setsMap.has(set.group_id)) {
        setsMap.set(set.group_id, []);
      }
      setsMap.get(set.group_id)?.push(processedSet);
    }
  });

  const processedGroups: StudySetGroup[] = groupsData.map((group: any) => ({
    ...group,
    study_sets: setsMap.get(group.id) || [],
  }));

  return processedGroups;
};

const GroupsIndex: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();

  const { data: groups, isLoading, isError, error } = useQuery<StudySetGroup[], Error>({
    queryKey: ['studySetGroups'],
    queryFn: fetchStudySetGroups,
  });

  const filteredGroups = groups?.filter((group: StudySetGroup) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    group.study_sets.some((set: StudySet) => set.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const toastId = showLoading(`Deleting group "${groupName}"...`);
    try {
      const { error } = await supabase
        .from('study_set_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Group "${groupName}" deleted successfully!`);
      queryClient.invalidateQueries({ queryKey: ['studySetGroups'] });
      queryClient.invalidateQueries({ queryKey: ['studySets'] }); // Invalidate study sets as their group_id might change to null
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to delete group.");
      console.error("Delete group error:", err);
    }
  };

  if (isLoading || isLoadingPreferences) {
    return (
      <div className="w-full px-4 md:px-8 py-6 sm:py-8 md:py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-10 w-full mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="glass-card shadow-premium rounded-[2rem]">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error loading groups: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">My Study Set Groups</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/groups/create" className="flex items-center">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-muted-foreground mb-6">
        Organize your study sets into custom groups for better management.
      </p>

      <div className="mb-6">
        <Label htmlFor="search-groups" className="sr-only">Search groups</Label>
        <Input
          id="search-groups"
          type="text"
          placeholder="Search groups by name, description, or contained sets..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {(filteredGroups?.length === 0 || !filteredGroups) ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No study set groups found!</h2>
          <p className="text-muted-foreground mt-2">
            {searchTerm ? "Try a different search term." : "Click 'Create New Group' to get started."}
          </p>
          {!searchTerm && (
            <Button asChild className="mt-4">
              <Link to="/groups/create">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group: StudySetGroup) => (
            <Card key={group.id} className="glass-card shadow-premium rounded-[2rem] h-full flex flex-col hover:-translate-y-1 transition-transform duration-300">
              <Link to={`/groups/${group.id}`} className="flex-grow">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <Folder className="mr-2 h-5 w-5 text-primary" /> {group.name}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-1">
                    Created: {format(new Date(group.created_at), 'PPP')}
                  </CardDescription>
                  {group.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {group.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-grow">
                  {group.study_sets.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <h3 className="text-md font-semibold mb-2 flex items-center">
                        <BookOpen className="mr-2 h-4 w-4" /> Sets in Group ({group.study_sets.length}):
                      </h3>
                      <div className="space-y-2 text-sm">
                        {group.study_sets.slice(0, 2).map((set: StudySet, setIdx: number) => (
                          <div key={set.id || setIdx} className="border-l-2 pl-2">
                            <p className="font-medium line-clamp-1">{set.title}</p>
                            {set.cards.length > 0 && (
                              <div className="space-y-1 text-xs text-muted-foreground mt-1">
                                {set.cards.slice(0, 1).map((card: { id: string; term: string; definition: string }, cardIdx: number) => (
                                  <p key={card.id || cardIdx} className="line-clamp-1">
                                    {card.term}: {card.definition}
                                  </p>
                                ))}
                                {set.cards.length > 1 && (
                                  <p className="text-muted-foreground text-xs mt-1">
                                    ...and {set.cards.length - 1} more cards
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {group.study_sets.length > 2 && (
                          <p className="text-muted-foreground text-xs mt-2">
                            ...and {group.study_sets.length - 2} more sets
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Link>
              <CardContent className="flex justify-end gap-2 pt-0">
                <Link to={`/groups/${group.id}/edit`}>
                  <Button variant="outline" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                {preferences?.confirm_deletion ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the
                          "{group.name}" group. Study sets within this group will become unassigned.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteGroup(group.id, group.name)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button variant="destructive" size="icon" onClick={() => handleDeleteGroup(group.id, group.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupsIndex;