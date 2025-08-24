import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NotebookCard } from '@/components/NotebookCard';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, LogOut, Menu, Settings as SettingsIcon, BarChart2, Trash2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useEffect, useState } from 'react'; // Explicitly import useEffect and useState

const profileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(50, 'Display name cannot exceed 50 characters'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const fetchUserProfile = async (): Promise<UserProfile | null> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
};

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: '',
    },
  });

  const { data: profile, isLoading, isError, error } = useQuery<UserProfile | null, Error>({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        display_name: profile.display_name || '',
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    const toastId = showLoading('Updating profile...');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated.');
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, display_name: values.display_name },
          { onConflict: 'id' }
        );

      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || 'Failed to update profile.');
      console.error('Profile update error:', err);
    }
  };

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
      navigate('/login');
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || 'Failed to sign out.');
      console.error('Sign out error:', err);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    const toastId = showLoading('Deleting account...');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated.');
      }

      // Delete the user from auth.users table
      const { error } = await supabase.rpc('delete_user_and_data'); // Using an RPC for full data deletion

      if (error) {
        throw error;
      }

      dismissToast(toastId);
      showSuccess('Your account and all associated data have been deleted.');
      queryClient.clear(); // Clear all cached data
      navigate('/login');
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || 'Failed to delete account.');
      console.error('Account deletion error:', err);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
        <Skeleton className="h-8 w-1/3 mb-8" />
        <NotebookCard>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-24" />
          </CardContent>
        </NotebookCard>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 text-center text-red-500 animate-fade-in">
        Error loading profile: {error?.message || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">User Profile</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Study Sets
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="flex items-center text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NotebookCard className="mb-6">
        <CardHeader>
          <CardTitle>Account & App Settings</CardTitle>
          <CardDescription>Manage your personal information and application preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
          <div className="border-t pt-4">
            <Link to="/settings">
              <Button variant="outline" className="w-full justify-start">
                <SettingsIcon className="mr-2 h-4 w-4" /> App Settings
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" className="w-full justify-start mt-2">
                <BarChart2 className="mr-2 h-4 w-4" /> Statistics
              </Button>
            </Link>
          </div>
        </CardContent>
      </NotebookCard>

      <NotebookCard className="mt-6">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that will affect your account and data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={isDeletingAccount}>
                {isDeletingAccount ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account,
                  all your study sets, notes, progress, and any other associated data.
                  Please type "DELETE" to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-4 py-4">
                <Input
                  id="confirm-delete-input"
                  placeholder="Type DELETE to confirm"
                  onChange={(e) => {
                    const confirmButton = document.getElementById('confirm-delete-button') as HTMLButtonElement;
                    if (confirmButton) {
                      confirmButton.disabled = e.target.value !== 'DELETE';
                    }
                  }}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  id="confirm-delete-button"
                  onClick={handleDeleteAccount}
                  disabled={true} // Disabled by default, enabled by typing "DELETE"
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeletingAccount ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Confirm Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default Profile;