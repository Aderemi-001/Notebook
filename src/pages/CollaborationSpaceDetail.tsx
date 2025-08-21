import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Users, Plus, User, Mail, KeyRound, Trash2, Pencil, MoreVertical, Loader2, Search, LogOut } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { cn } from '@/lib/utils';

interface CollaborationSpace {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by_user_id: string;
  profiles: { display_name: string | null } | null; // Creator's profile
  space_members: {
    user_id: string;
    role: string;
    profiles: { display_name: string | null } | null;
  }[];
}

interface UserProfile {
  id: string;
  display_name: string | null;
}

const fetchSpaceDetails = async (spaceId: string): Promise<CollaborationSpace> => {
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
      profiles(display_name), // Re-added profiles join
      space_members( // Re-added space_members join
        user_id,
        role,
        profiles(display_name)
      )
    `)
    .eq('id', spaceId)
    .single();

  if (error) {
    console.error("Error fetching collaboration space details:", error);
    throw new Error("Failed to fetch collaboration space details.");
  }
  if (!data) {
    throw new Error("Collaboration space not found.");
  }
  return data as CollaborationSpace;
};

const fetchUsersForSearch = async (searchTerm: string): Promise<UserProfile[]> => {
  if (!searchTerm.trim()) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .ilike('display_name', `%${searchTerm}%`)
    .limit(10); // Limit search results

  if (error) {
    console.error("Error searching users:", error);
    throw new Error("Failed to search users.");
  }
  return data || [];
};

const CollaborationSpaceDetail: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { preferences } = useUserPreferences();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<Set<string>>(new Set());
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUserId();
  }, []);

  const { data: space, isLoading, isError, error } = useQuery<CollaborationSpace, Error>({
    queryKey: ['collaborationSpace', spaceId],
    queryFn: () => fetchSpaceDetails(spaceId!),
    enabled: !!spaceId && currentUserId !== null,
    onSuccess: (data) => {
      if (currentUserId) {
        setIsOwner(data.created_by_user_id === currentUserId);
        const member = data.space_members.find(m => m.user_id === currentUserId);
        setCurrentUserRole(member?.role || null);
      }
    }
  });

  const { data: searchResults, isLoading: isLoadingSearchResults } = useQuery<UserProfile[], Error>({
    queryKey: ['userSearch', memberSearchTerm],
    queryFn: () => fetchUsersForSearch(memberSearchTerm),
    enabled: showAddMemberDialog && !!memberSearchTerm.trim(),
  });

  const handleRemoveMember = async (memberUserId: string, memberDisplayName: string) => {
    const toastId = showLoading(`Removing ${memberDisplayName} from space...`);
    try {
      const { error } = await supabase
        .from('space_members')
        .delete()
        .eq('space_id', spaceId!)
        .eq('user_id', memberUserId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`${memberDisplayName} removed successfully!`);
      queryClient.invalidateQueries({ queryKey: ['collaborationSpace', spaceId] });
      queryClient.invalidateQueries({ queryKey: ['collaborationSpaces'] });
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to remove member.");
      console.error("Remove member error:", err);
    }
  };

  const handleChangeMemberRole = async (memberUserId: string, newRole: string, memberDisplayName: string) => {
    const toastId = showLoading(`Updating ${memberDisplayName}'s role to ${newRole}...`);
    try {
      const { error } = await supabase
        .from('space_members')
        .update({ role: newRole })
        .eq('space_id', spaceId!)
        .eq('user_id', memberUserId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`${memberDisplayName}'s role updated to ${newRole}!`);
      queryClient.invalidateQueries({ queryKey: ['collaborationSpace', spaceId] });
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to update member role.");
      console.error("Change role error:", err);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsersToAdd.size === 0) {
      showError("Please select at least one user to add.");
      return;
    }

    setIsAddingMembers(true);
    const toastId = showLoading(`Adding ${selectedUsersToAdd.size} member(s)...`);

    try {
      const membersToInsert = Array.from(selectedUsersToAdd).map(userId => ({
        space_id: spaceId!,
        user_id: userId,
        role: 'member', // Default role for new members
      }));

      const { error } = await supabase
        .from('space_members')
        .insert(membersToInsert)
        .select();

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`${selectedUsersToAdd.size} member(s) added successfully!`);
      setSelectedUsersToAdd(new Set());
      setMemberSearchTerm("");
      setShowAddMemberDialog(false);
      queryClient.invalidateQueries({ queryKey: ['collaborationSpace', spaceId] });
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to add members.");
      console.error("Add members error:", err);
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleDeleteSpace = async (spaceId: string, spaceName: string) => {
    const toastId = showLoading(`Deleting collaboration space "${spaceName}"...`);
    try {
      if (!currentUserId) {
        throw new Error("User not authenticated.");
      }

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
      navigate('/collaboration'); // Redirect after deletion
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to delete collaboration space.");
      console.error("Delete space error:", err);
    }
  };

  const handleLeaveSpace = async () => {
    const toastId = showLoading(`Leaving collaboration space "${space?.name}"...`);
    try {
      if (!currentUserId) {
        throw new Error("User not authenticated.");
      }

      const { error } = await supabase
        .from('space_members')
        .delete()
        .eq('space_id', spaceId!)
        .eq('user_id', currentUserId);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Successfully left "${space?.name}".`);
      queryClient.invalidateQueries({ queryKey: ['collaborationSpaces'] });
      navigate('/collaboration');
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Failed to leave space.");
      console.error("Leave space error:", err);
    }
  };

  const handleCheckboxChange = (userId: string, checked: boolean) => {
    setSelectedUsersToAdd(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  if (!spaceId || currentUserId === null) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        {currentUserId === null ? "Authenticating user..." : "No collaboration space ID provided."}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <Skeleton className="h-6 w-1/3 mb-4" />
        <Skeleton className="h-4 w-full mb-6" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading collaboration space: {error?.message || "Unknown error"}
      </div>
    );
  }

  if (!space) {
    return (
      <div className="container mx-auto py-10 text-center">
        Collaboration space not found.
      </div>
    );
  }

  const canManageMembers = isOwner || currentUserRole === 'admin';

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <Users className="mr-3 h-7 w-7 text-primary" /> {space.name}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/collaboration" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Spaces
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {isOwner && (
              <DropdownMenuItem asChild>
                <Link to={`/collaboration/${spaceId}/edit`} className="flex items-center">
                  <Pencil className="mr-2 h-4 w-4" /> Edit Space (Coming Soon)
                </Link>
              </DropdownMenuItem>
            )}
            {canManageMembers && (
              <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" /> Add Member
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Add Members to {space.name}</DialogTitle>
                    <DialogDescription>
                      Search for users by display name and add them to this collaboration space.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-grow flex flex-col overflow-hidden">
                    <div className="mb-4">
                      <Input
                        type="text"
                        placeholder="Search users by display name..."
                        value={memberSearchTerm}
                        onChange={(e) => setMemberSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <ScrollArea className="flex-grow pr-4 -mr-4">
                      {isLoadingSearchResults ? (
                        <div className="space-y-3">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : searchResults?.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          {memberSearchTerm.trim() ? "No users found matching your search." : "Start typing to search for users."}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {searchResults?.map(userProfile => {
                            const isAlreadyMember = space.space_members.some(m => m.user_id === userProfile.id);
                            return (
                              <div
                                key={userProfile.id}
                                className={cn(
                                  "flex items-center justify-between p-3 border rounded-md",
                                  selectedUsersToAdd.has(userProfile.id) ? "bg-primary/10 border-primary" : "bg-background",
                                  isAlreadyMember && "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`user-${userProfile.id}`}
                                    checked={selectedUsersToAdd.has(userProfile.id) || isAlreadyMember}
                                    onCheckedChange={(checked: boolean) => handleCheckboxChange(userProfile.id, checked)}
                                    disabled={isAlreadyMember}
                                  />
                                  <Label htmlFor={`user-${userProfile.id}`} className="cursor-pointer">
                                    <span className="font-medium">{userProfile.display_name || 'Unknown User'}</span>
                                    {isAlreadyMember && <span className="text-sm text-muted-foreground ml-2">(Already a member)</span>}
                                  </Label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddMembers} disabled={selectedUsersToAdd.size === 0 || isAddingMembers}>
                      {isAddingMembers ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" /> Add Selected ({selectedUsersToAdd.size})
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <DropdownMenuSeparator />
            {!isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Leave Space
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to leave this space?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will no longer have access to "{space.name}" and its shared content. You can be re-invited later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLeaveSpace}>
                      Leave Space
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {isOwner && preferences?.confirm_deletion ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center cursor-pointer text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Space
                  </DropdownMenuItem>
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
            ) : isOwner && (
              <DropdownMenuItem onClick={() => handleDeleteSpace(space.id, space.name)} className="flex items-center text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Space
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-muted-foreground mb-6">{space.description}</p>

      <NotebookCard className="mb-6">
        <CardHeader className="pl-10">
          <CardTitle>Space Information</CardTitle>
          <CardDescription>Details about this collaboration space.</CardDescription>
        </CardHeader>
        <CardContent className="pl-10 space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <User className="mr-2 h-4 w-4" />
            <span>Created by: {space.profiles?.display_name || 'Unknown User'}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Your Role: {currentUserRole ? currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1) : 'N/A'}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Mail className="mr-2 h-4 w-4" />
            <span>Created on: {format(new Date(space.created_at), 'PPP')}</span>
          </div>
        </CardContent>
      </NotebookCard>

      <h2 className="text-2xl font-semibold mb-4">Members ({space.space_members.length})</h2>
      {space.space_members.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No members in this space yet.</p>
          {canManageMembers && (
            <Button onClick={() => setShowAddMemberDialog(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" /> Add First Member
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {space.space_members.map(member => (
            <NotebookCard key={member.user_id} className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-10">
                <CardTitle className="text-lg font-semibold">{member.profiles?.display_name || 'Unknown User'}</CardTitle>
                <span className="text-sm text-muted-foreground">{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</span>
              </CardHeader>
              <CardContent className="flex justify-end gap-2 pt-0">
                {canManageMembers && member.user_id !== currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleChangeMemberRole(member.user_id, member.role === 'admin' ? 'member' : 'admin', member.profiles?.display_name || 'Unknown User')}>
                        {member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {preferences?.confirm_deletion ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive cursor-pointer">
                              Remove Member
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {member.profiles?.display_name || 'this user'} from the space.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveMember(member.user_id, member.profiles?.display_name || 'Unknown User')}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <DropdownMenuItem onClick={() => handleRemoveMember(member.user_id, member.profiles?.display_name || 'Unknown User')} className="text-destructive">
                          Remove Member
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardContent>
            </NotebookCard>
          ))}
        </div>
      )}

      <h2 className="text-2xl font-semibold mb-4 mt-8">Shared Study Sets (Coming Soon!)</h2>
      <NotebookCard>
        <CardContent className="pl-10">
          <div className="h-32 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
            Shared study sets will appear here.
          </div>
        </CardContent>
      </NotebookCard>

      <h2 className="text-2xl font-semibold mb-4 mt-8">Shared Notes (Coming Soon!)</h2>
      <NotebookCard>
        <CardContent className="pl-10">
          <div className="h-32 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
            Shared notes will appear here.
          </div>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default CollaborationSpaceDetail;