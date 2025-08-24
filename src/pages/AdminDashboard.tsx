import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotebookCard } from "@/components/NotebookCard";
import { ArrowLeft, Users, BookOpen, Loader2, ShieldCheck, Mail, User2, Settings, Eye, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  email: string;
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

interface AdminDashboardStats {
  totalUsers: number;
  totalStudySets: number;
}

const fetchAdminDashboardData = async (): Promise<{ users: UserProfile[], studySets: StudySet[], stats: AdminDashboardStats }> => {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    throw new Error("User not authenticated.");
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      avatar_url,
      is_admin,
      auth_users (email)
    `);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    throw new Error("Failed to fetch user profiles.");
  }

  const users: UserProfile[] = profilesData.map((p: any) => ({
    id: p.id,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    is_admin: p.is_admin,
    email: p.auth_users?.email || 'N/A',
  }));

  const { data: studySetsData, error: studySetsError } = await supabase.rpc('get_all_visible_study_sets_with_card_count');
  if (studySetsError) {
    console.error("Error fetching study sets:", studySetsError);
    throw new Error("Failed to fetch study sets.");
  }

  const studySets: StudySet[] = studySetsData.map((set: any) => ({
    ...set,
    is_owner: set.user_id === authUser.id,
  }));

  return {
    users,
    studySets,
    stats: {
      totalUsers: users.length,
      totalStudySets: studySets.length,
    },
  };
};

const AdminDashboard: React.FC = () => {
  console.log("AdminDashboard component is rendering."); // Added console log
  const queryClient = useQueryClient();
  const { user: currentUser, profile, loading: isLoadingAuth } = useAuth();

  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<UserProfile | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['adminDashboardData', currentUser?.id, profile?.is_admin],
    queryFn: fetchAdminDashboardData,
    enabled: !!currentUser && !!profile?.is_admin && !isLoadingAuth,
  });

  const toggleAdminStatusMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: isAdmin })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDashboardData'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      showSuccess("Admin status updated successfully!");
    },
    onError: (err) => {
      showError(`Failed to update admin status: ${err.message}`);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('delete_user_and_data_by_admin', { p_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDashboardData'] });
      showSuccess("User and all associated data deleted successfully!");
      setIsDeleteUserDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (err) => {
      showError(`Failed to delete user: ${err.message}`);
    },
  });

  if (isLoadingAuth || isLoading) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/2 mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-full mb-4" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!currentUser || !profile?.is_admin) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        You do not have permission to view this page.
        <Button asChild className="mt-4">
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error loading admin dashboard: {error?.message || "Unknown error"}
      </div>
    );
  }

  const { users, studySets, stats } = data!;

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
          <ShieldCheck className="mr-3 h-7 w-7 text-primary" /> Admin Dashboard
        </h1>
        <Button asChild variant="outline">
          <Link to="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground mb-6">
        Overview and management of all users and study sets in the application.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Study Sets</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudySets}</div>
            <p className="text-xs text-muted-foreground">All sets created</p>
          </CardContent>
        </Card>
      </div>

      <NotebookCard className="mb-8">
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <CardDescription>View and manage user accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((userItem: UserProfile) => (
              <div key={userItem.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center space-x-3">
                  <User2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{userItem.display_name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {userItem.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`admin-switch-${userItem.id}`}
                      checked={userItem.is_admin}
                      onCheckedChange={(checked: boolean) => toggleAdminStatusMutation.mutate({ userId: userItem.id, isAdmin: checked })}
                      disabled={toggleAdminStatusMutation.isPending || userItem.id === currentUser?.id}
                    />
                    <Label htmlFor={`admin-switch-${userItem.id}`}>Admin</Label>
                  </div>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      disabled={deleteUserMutation.isPending || userItem.id === currentUser?.id}
                      onClick={() => setUserToDelete(userItem)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </NotebookCard>

      <NotebookCard>
        <CardHeader>
          <CardTitle>Manage Study Sets</CardTitle>
          <CardDescription>View and manage all study sets in the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {studySets.map((set: StudySet) => (
              <div key={set.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{set.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Owner: {set.display_name || 'Anonymous'}
                      <Badge variant={set.is_public ? "secondary" : "outline"} className="ml-2">
                        {set.is_public ? "Public" : "Private"}
                      </Badge>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button asChild variant="outline" size="icon">
                    <Link to={`/sets/${set.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="icon">
                    <Link to={`/sets/${set.id}/edit`}>
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </NotebookCard>

      <AlertDialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user "{userToDelete?.display_name || userToDelete?.email}"
              and all their associated data (study sets, notes, progress, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;