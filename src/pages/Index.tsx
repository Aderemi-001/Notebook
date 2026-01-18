import * as React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { PlusCircle, Search, Loader2, BookOpen, Users, Settings, Trash2, Edit, Eye, Share2, Copy, ArrowRight, ShieldCheck, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Use get_study_sets_with_card_count to fetch only the user's own sets
  const { data, error } = await supabase.rpc('get_study_sets_with_card_count');
  if (error) throw error;

  // Explicitly cast data to the expected array type
  const rpcResults = data as RpcStudySetResult[];

  return rpcResults.map((set: RpcStudySetResult) => ({
    ...set,
    is_owner: true, // All sets returned by this RPC are owned by the current user
  }));
};

const deleteStudySet = async (setId: string) => {
  const { error } = await supabase.from('study_sets').delete().eq('id', setId);
  if (error) throw error;
};

const Index: React.FC = () => {
  const { t } = useLanguage();
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
    queryKey: ['studySets', user?.id], // Removed profile?.is_admin from queryKey as filtering is now user-specific
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
            <Card key={i} className="glass-card shadow-premium rounded-[2rem] border-white/20">
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
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-8 py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
          <BookOpen className="mr-3 h-7 w-7" />
          {t('library.mySets')}
        </h1>
        {user ? (
          <Button asChild>
            <Link to="/create">
              <PlusCircle className="mr-2 h-4 w-4" /> {t('library.createSet')}
            </Link>
          </Button>
        ) : (
          <Dialog open={isLoginPromptOpen} onOpenChange={setIsLoginPromptOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Set
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>{t('library.loginRequired')}</DialogTitle>
                <DialogDescription>
                  {t('library.loginRequiredDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p>{t('library.loginOrSignup')}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsLoginPromptOpen(false)}>{t('library.cancel')}</Button>
                <Button asChild>
                  <Link to="/login" onClick={() => setIsLoginPromptOpen(false)}>{t('library.loginBtn')}</Link>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mb-8 relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground transition-colors group-focus-within:text-primary z-10" />
        <Input
          type="text"
          placeholder={t('library.searchPlaceholder')}
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-12 pr-4 py-7 rounded-[1.25rem] bg-white/80 dark:bg-white/5 border-input hover:border-primary/50 focus:border-primary focus:ring-primary/20 transition-all text-lg backdrop-blur-md shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="glass-card shadow-premium rounded-[2rem] border-white/20">
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
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center text-red-500">Error loading study sets: {error?.message}</div>
      ) : filteredStudySets && filteredStudySets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudySets.map((set) => (
            <Card key={set.id} className="glass-card shadow-premium rounded-[2rem] border-white/20 hover:border-primary/30 transition-all duration-300 group">
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
                      <DropdownMenuLabel>{t('library.setActions')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to={`/sets/${set.id}/study`}>
                          <Eye className="mr-2 h-4 w-4" /> {t('library.study')}
                        </Link>
                      </DropdownMenuItem>
                      {(set.is_owner || profile?.is_admin) && ( // Allow edit/delete if owner OR admin
                        <>
                          <DropdownMenuItem onClick={() => handleEditClick(set)}>
                            <Edit className="mr-2 h-4 w-4" /> {t('library.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareClick(set.id)}>
                            <Share2 className="mr-2 h-4 w-4" /> {t('library.share')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(set.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> {t('library.delete')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardTitle>
                {/* Changed <p> to <div> here to fix DOM nesting warning */}
                <div className="flex items-center text-sm text-muted-foreground">
                  {set.is_owner ? (
                    <span className="flex items-center">
                      <Users className="mr-1 h-3 w-3" /> {t('library.mySet')}
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Users className="mr-1 h-3 w-3" /> {t('library.by')}: {set.display_name || 'Anonymous'}
                    </span>
                  )}
                  {set.is_public ? (
                    <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {t('library.public')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> {t('library.private')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm line-clamp-2">{set.description || 'No description provided.'}</p>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {set.cards_count} {t('library.cards')}
                </div>
                <Button asChild className="w-full bg-secondary/50 text-secondary-foreground hover:bg-secondary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-none rounded-xl h-10 px-3">
                  <Link to={`/sets/${set.id}/study`} className="flex items-center justify-center gap-2">
                    <span className="text-sm font-bold truncate">{t('library.studyNow')}</span>
                    <ArrowRight className="h-4 w-4 opacity-50 group-hover:translate-x-1 transition-transform shrink-0" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold mb-2">{t('library.noSetsTitle')}</h2>
          <p className="text-muted-foreground mb-4">
            {user ? t('library.noSetsDesc') : t('library.loginRequiredDesc')}
          </p>
          {user && (
            <Button asChild>
              <Link to="/create">
                <PlusCircle className="mr-2 h-4 w-4" /> {t('library.createSet')}
              </Link>
            </Button>
          )}
          {!user && (
            <Button asChild>
              <Link to="/login">
                {t('library.loginBtn')}
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('library.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('library.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{t('library.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t('library.deleteBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('library.shareTitle')}</DialogTitle>
            <DialogDescription>
              {t('library.shareDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="share-link" className="sr-only">
                {t('library.share')}
              </Label>
              <Input
                id="share-link"
                defaultValue={setShareLink}
                readOnly
              />
            </div>
            <Button type="submit" onClick={handleCopyLink} className="px-3">
              <span className="sr-only">{t('library.copy')}</span>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>{t('library.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Study Set Dialog */}
      <Dialog open={isEditSetDialogOpen} onOpenChange={setIsEditSetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('library.editTitle')}</DialogTitle>
            <DialogDescription>
              {t('library.editDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">
                {t('library.title')}
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
                {t('library.description')}
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
                {t('library.isPublic')}
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
            <Button variant="outline" onClick={() => setIsEditSetDialogOpen(false)} disabled={updateSetMutation.isPending}>{t('library.cancel')}</Button>
            <Button type="submit" onClick={handleUpdateSet} disabled={updateSetMutation.isPending}>
              {updateSetMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {t('library.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;