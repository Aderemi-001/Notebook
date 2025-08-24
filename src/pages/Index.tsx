import * as React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Loader2, BookOpen, Users, Settings, Trash2, Edit, Eye, Share2, Copy, ArrowRight, ShieldCheck, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { NotebookCard } from '@/components/NotebookCard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from '@/components/ui/badge';

// Define the interface for the data returned by the RPC
interface RpcStudySetResult {
  id: string;
  title: string;
  description: string | null;
  cards_count: number;
  is_public: boolean;
  user_id: string;
  display_name: string | null;
  is_owner: boolean; // Now included in the RPC
}

interface StudySet {
  id: string;
  title: string;
  description: string | null;
  cards_count: number;
  is_public: boolean;
  user_id: string;
  display_name: string | null;
  is_owner: boolean;
}

const fetchStudySets = async (): Promise<StudySet[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return []; // No user, no personal study sets
  }

  // Use get_all_visible_study_sets_with_card_count to fetch sets based on user/admin status
  const { data, error } = await supabase.rpc('get_all_visible_study_sets_with_card_count');
  if (error) throw error;

  // Explicitly cast data to the expected array type
  const rpcResults = data as RpcStudySetResult[];

  return rpcResults.map((set: RpcStudySetResult) => ({
    ...set,
    is_owner: set.user_id === user.id, // Determine ownership based on current user ID
  }));
};

const deleteStudySet = async (setId: string) => {
  const { error } = await supabase.from('study_sets').delete().eq('id', setId);
  if (error) throw error;
};

const Index: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, profile, loading: isLoadingAuth } = useAuth(); // Get profile for admin check
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [setToDelete, setSetToDelete] = React.useState<string | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
  const [setShareLink, setSetShareLink] = React.useState('');
  const [isEditSetDialogOpen, setIsEditSetDialogOpen] = React.useState(false);
  const [setToEdit, setSetToEdit] = React.useState<StudySet | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editIsPublic, setEditIsPublic] = React.useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = React.useState(false); // State for login prompt

  const { data: studySets, isLoading, isError, error } = useQuery<StudySet[], Error>({
    queryKey: ['studySets', profile?.is_admin], // Invalidate query if admin status changes
    queryFn: fetchStudySets,
    enabled: !!user && !isLoadingAuth, // Only fetch if user is logged in
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deleteStudySet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
      showSuccess('Study set deleted successfully!');
      setIsDeleteDialogOpen(false);
    },
    onError: (err) => {
      showError(`Error deleting study set: ${err.message}`);
    },
  });

  const updateSetMutation = useMutation<void, Error, { id: string; title: string; description: string | null; is_public: boolean }>({
    mutationFn: async ({ id, title, description, is_public }) => {
      const { error } = await supabase.from('study_sets').update({ title, description, is_public }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studySets'] });
      showSuccess('Study set updated successfully!');
      setIsEditSetDialogOpen(false);
    },
    onError: (err) => {
      showError(`Error updating study set: ${err.message}`);
    },
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredStudySets = studySets?.filter(set =>
    set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    set.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    set.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (setId: string) => {
    setSetToDelete(setId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (setToDelete) {
      deleteMutation.mutate(setToDelete);
    }
  };

  const handleShareClick = (setId: string) => {
    const shareLink = `${window.location.origin}/sets/${setId}`;
    setSetShareLink(shareLink);
    setIsShareDialogOpen(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(setShareLink);
    showSuccess('Share link copied to clipboard!');
  };

  const handleEditClick = (set: StudySet) => {
    setSetToEdit(set);
    setEditTitle(set.title);
    setEditDescription(set.description || '');
    setEditIsPublic(set.is_public);
    setIsEditSetDialogOpen(true);
  };

  const handleUpdateSet = () => {
    if (setToEdit) {
      updateSetMutation.mutate({
        id: setToEdit.id,
        title: editTitle,
        description: editDescription,
        is_public: editIsPublic,
      });
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-10 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <NotebookCard key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </CardFooter>
            </NotebookCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
          <BookOpen className="mr-3 h-7 w-7" />
          {profile?.is_admin ? "All Study Sets (Admin View)" : "My Study Sets"}
        </h1>
        {user ? (
          <Button asChild>
            <Link to="/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Set
            </Link>
          </Button>
        ) : (
          <Dialog open={isLoginPromptOpen} onOpenChange={setIsLoginPromptOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Set
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Login Required</DialogTitle>
                <DialogDescription>
                  You need to be logged in to create new study sets.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p>Please log in or sign up to continue.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsLoginPromptOpen(false)}>Cancel</Button>
                <Button asChild>
                  <Link to="/login" onClick={() => setIsLoginPromptOpen(false)}>Login / Sign Up</Link>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={profile?.is_admin ? "Search all study sets by title, description, or owner..." : "Search your study sets..."}
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-10" // Added left padding for the icon
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <NotebookCard key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </CardFooter>
            </NotebookCard>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center text-red-500">Error loading study sets: {error?.message}</div>
      ) : filteredStudySets && filteredStudySets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudySets.map((set) => (
            <NotebookCard key={set.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <Link to={`/sets/${set.id}`} className="hover:underline">
                    {set.title}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Set Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to={`/sets/${set.id}/study`}>
                          <Eye className="mr-2 h-4 w-4" /> Study
                        </Link>
                      </DropdownMenuItem>
                      {(set.is_owner || profile?.is_admin) && ( // Allow edit/delete if owner OR admin
                        <>
                          <DropdownMenuItem onClick={() => handleEditClick(set)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Set
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareClick(set.id)}>
                            <Share2 className="mr-2 h-4 w-4" /> Share
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(set.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardTitle>
                <CardDescription className="flex items-center text-sm text-muted-foreground">
                  {set.is_owner ? (
                    <span className="flex items-center">
                      <Users className="mr-1 h-3 w-3" /> My Set
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Users className="mr-1 h-3 w-3" /> By: {set.display_name || 'Anonymous'}
                    </span>
                  )}
                  {set.is_public ? (
                    <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Public
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Private
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm line-clamp-2">{set.description || 'No description provided.'}</p>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {set.cards_count} {set.cards_count === 1 ? 'card' : 'cards'}
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link to={`/sets/${set.id}/study`}>Study Now <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardFooter>
            </NotebookCard>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold mb-2">No Study Sets Found</h2>
          <p className="text-muted-foreground mb-4">
            {user ? "Start by creating your first study set!" : "Log in to create and manage your study sets."}
          </p>
          {user && (
            <Button asChild>
              <Link to="/create">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Set
              </Link>
            </Button>
          )}
          {!user && (
            <Button asChild>
              <Link to="/login">
                Login / Sign Up
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this study set and all associated cards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Share Study Set</DialogTitle>
            <DialogDescription>
              Copy the link below to share this study set.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="share-link" className="sr-only">
                Share link
              </Label>
              <Input
                id="share-link"
                defaultValue={setShareLink}
                readOnly
              />
            </div>
            <Button type="submit" onClick={handleCopyLink} className="px-3">
              <span className="sr-only">Copy link</span>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Study Set Dialog */}
      <Dialog open={isEditSetDialogOpen} onOpenChange={setIsEditSetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Study Set</DialogTitle>
            <DialogDescription>
              Make changes to your study set here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">
                Title
              </Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-public" className="text-right">
                Public
              </Label>
              <Switch
                id="edit-public"
                checked={editIsPublic}
                onCheckedChange={setEditIsPublic}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSetDialogOpen(false)} disabled={updateSetMutation.isPending}>Cancel</Button>
            <Button type="submit" onClick={handleUpdateSet} disabled={updateSetMutation.isPending}>
              {updateSetMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;