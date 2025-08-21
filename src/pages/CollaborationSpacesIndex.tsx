import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, PlusCircle, Users, Menu, Pencil, Trash2 } from 'lucide-react';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';

interface CollaborationSpace {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by_user_id: string;
  profiles: { display_name: string | null } | null; // To show creator's name
  space_members: { role: string }[]; // To check user's role in the space
}

const fetchCollaborationSpaces = async (): Promise<CollaborationSpace[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from('collaboration_spaces')
    .select(`
      id,
      name,
      description,
      created_at,
      created_by_user_id,
      profiles(display_name)
      // Removed space_members join for debugging
    `)
    .order('name', { ascending: true });

  if (error) {
    console.error("Error fetching collaboration spaces:", error);
    throw new Error("Failed to fetch your collaboration spaces.");
  }
  
  // Filter space_members to only include the current user's role for the index page
  // Since space_members is not joined, this will always be an empty array for now
  return data?.map(space => ({
    ...space,
    space_members: [], 
  })) || [];
};

const CollaborationSpacesIndex: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUserId();
  }, []);

  const { data: spaces, isLoading, isError, error } = useQuery<CollaborationSpace[], Error>({
    queryKey: ['collaborationSpaces'],
    queryFn: fetchCollaborationSpaces,
  });

  const filteredSpaces = spaces?.filter(space =>
    space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (space.description && space.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (space.profiles?.display_name && space.profiles.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteSpace = async (spaceId: string, spaceName: string) => {
    const toastId = showLoading(`Deleting collaboration space "${spaceName}"...`);
    try {
      if (!currentUserId) {
        throw new Error("User not authenticated.");
      }

      // Check if the current user is the creator of the space
      const { data: spaceData, error: fetchSpaceError } = await supabase
        .from('collaboration_spaces')
        .select('created_by_user_id')
        .eq('id', spaceId)
        .single();

      if (fetchSpaceError || !spaceData || spaceData.created_by_user_id !== currentUserId) {
        throw new Error("You do not have permission to delete this space.");
      }

      const { error } = await supabase
        .from('collaboration_spaces')
        .delete()
        .eq('id', spaceId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Collaboration space "${spaceName}" deleted successfully!`);
      queryClient.invalidateQueries({ queryKey: ['collaborationSpaces'] });
      // Potentially invalidate queries for linked study sets/notes if they become unlinked
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to delete collaboration space.");
      console.error("Delete space error:", err);
    }
  };

  if (isLoading || isLoadingPreferences || currentUserId === null) { // Wait for currentUserId to be set
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-10 w-full mb-6" />
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
        Error loading collaboration spaces: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Collaboration Spaces</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/collaboration/create" className="flex items-center">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Space
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Sets
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-muted-foreground mb-6">
        Collaborate with others by sharing notes and study sets in dedicated spaces.
      </p>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search spaces by name, description, or creator..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {(filteredSpaces?.length === 0 || !filteredSpaces) ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No collaboration spaces found!</h2>
          <p className="text-muted-foreground mt-2">
            {searchTerm ? "Try a different search term." : "Click 'Create New Space' to get started or ask someone to invite you."}
          </p>
          {!searchTerm && (
            <Button asChild className="mt-4">
              <Link to="/collaboration/create">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Space
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSpaces.map((space) => {
            const isCreator = space.created_by_user_id === currentUserId;
            // currentUserSpaceRole is not available with simplified query, so it will be undefined
            const currentUserSpaceRole = undefined; 

            return (
              <NotebookCard key={space.id} className="h-full flex flex-col">
                <CardHeader className="flex-grow">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary" /> {space.name}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-1">
                    Created by: {space.profiles?.display_name || 'Unknown User'} on {format(new Date(space.created_at), 'PPP')}
                  </CardDescription>
                  {space.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {space.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex justify-end gap-2 pt-0">
                  {/* Display user's role if they are a member */}
                  {currentUserSpaceRole && (
                    <span className="text-sm text-muted-foreground self-center mr-2">
                      Your Role: {currentUserSpaceRole.charAt(0).toUpperCase() + currentUserSpaceRole.slice(1)}
                    </span>
                  )}
                  <Link to={`/collaboration/${space.id}`}>
                    <Button variant="outline" size="sm">
                      View Space
                    </Button>
                  </Link>
                  {/* Only creator can delete for now */}
                  {isCreator && preferences?.confirm_deletion ? (
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
                            "{space.name}" collaboration space and all its memberships.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSpace(space.id, space.name)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : isCreator && (
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteSpace(space.id, space.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </NotebookCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CollaborationSpacesIndex;