import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Keep these imports for sub-components
import { NotebookCard } from '@/components/NotebookCard'; // Import NotebookCard
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle'; // Import ThemeToggle

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

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-8 w-1/3 mb-8" />
        <NotebookCard> {/* Changed to NotebookCard */}
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
      <div className="container mx-auto py-10 text-center text-red-500">
        Error loading profile: {error?.message || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">User Profile</h1>
        <div className="flex flex-wrap gap-2"> {/* Added flex-wrap */}
          <Button asChild variant="outline">
            <Link to="/" className="flex items-center">
              <React.Fragment>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
              </React.Fragment>
            </Link>
          </Button>
          <Button onClick={handleSignOut} variant="destructive" className="flex items-center">
            <React.Fragment>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </React.Fragment>
          </Button>
        </div>
      </div>

      <NotebookCard> {/* Changed to NotebookCard */}
        <CardHeader>
          <CardTitle>Manage Your Profile</CardTitle>
          <CardDescription>Update your display name and other profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-between">
                <Button type="submit">Save Changes</Button>
                <ThemeToggle />
              </div>
            </form>
          </Form>
        </CardContent>
      </NotebookCard>
    </div>
  );
};

export default Profile;