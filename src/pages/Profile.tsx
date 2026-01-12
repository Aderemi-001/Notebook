import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Settings as SettingsIcon, BarChart2, Trash2, Loader2, Globe, Twitter, Instagram, MapPin, Info, Trophy, LayoutGrid, Crown, Camera, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarSelector } from '@/components/profile/AvatarSelector';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';


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
import { useEffect, useState } from 'react';
import { AdminBadge } from '@/components/AdminBadge';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { BadgeList } from '@/components/gamification/BadgeList';
import { gamificationService } from '@/services/gamificationService';

const BadgeListWrapper = ({ userId }: { userId?: string }) => {
  const { data: badges, isLoading } = useQuery({
    queryKey: ['badges', userId],
    queryFn: () => gamificationService.getBadges(userId || ''),
    enabled: !!userId
  });

  // Transform badges to match Badge interface (cast category to union type, handle awarded_at)
  const transformedBadges = (badges || []).map(badge => ({
    ...badge,
    category: (badge.category === 'general' || badge.category === 'streak' || badge.category === 'mastery' || badge.category === 'creation' 
      ? badge.category 
      : null) as 'general' | 'streak' | 'mastery' | 'creation' | null,
    awarded_at: (typeof badge.awarded_at === 'string' ? badge.awarded_at : undefined)
  }));
  return <BadgeList badges={transformedBadges} isLoading={isLoading} />;
};

const profileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(50, 'Display name cannot exceed 50 characters'),
  bio: z.string().max(200, 'Bio cannot exceed 200 characters').optional().nullable(),
  location: z.string().max(100, 'Location cannot exceed 100 characters').optional().nullable(),
  website: z.string().url('Must be a valid URL').or(z.literal('')).optional().nullable(),
  twitter_handle: z.string().max(30).optional().nullable(),
  instagram_handle: z.string().max(30).optional().nullable(),
  is_public_profile: z.boolean().default(false),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  bio: string | null;
  location: string | null;
  website: string | null;
  twitter_handle: string | null;
  instagram_handle: string | null;
  is_public_profile: boolean;
  subscriptions: { status: string }[];
  stats?: {
    total_sets: number;
    mastered_cards: number;
  };
}

const fetchUserProfile = async (): Promise<UserProfile | null> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }
  if (!user) {
    return null;
  }

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, is_admin, bio, location, website, twitter_handle, instagram_handle, is_public_profile')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    throw profileError;
  }

  // Fetch subscription, total sets, and mastered cards count
  const [subRes, setsRes, masteredRes] = await Promise.all([
    supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
    supabase.from('study_sets').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('user_progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'mastered')
  ]);

  if (!profile) return null;

  return {
    ...profile,
    subscriptions: subRes.data ? [subRes.data] : [],
    stats: {
      total_sets: setsRes.count || 0,
      mastered_cards: masteredRes.count || 0
    }
  } as UserProfile;
};

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refreshProfile: refreshAuthProfile } = useAuth(); // Rename to avoid confusion
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Use local query to get full profile stats
  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: fetchUserProfile,
    enabled: !!user,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: '',
      bio: '',
      location: '',
      website: '',
      twitter_handle: '',
      instagram_handle: '',
      is_public_profile: false,
    },
  });

  // Reset form when profile data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        twitter_handle: profile.twitter_handle || '',
        instagram_handle: profile.instagram_handle || '',
        is_public_profile: profile.is_public_profile || false,
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    const toastId = showLoading('Updating profile...');

    try {
      const { error } = await supabase
        .from('profiles')
        .update(values)
        .eq('id', user.id);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Profile updated successfully');

      // Invalidate queries and refresh auth context
      queryClient.invalidateQueries({ queryKey: ['userProfile', user.id] });
      await refreshAuthProfile();

    } catch (error: any) {
      dismissToast(toastId);
      console.error('Error updating profile:', error);
      showError(`Failed to update profile: ${error.message}`);
    }
  };



  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      // Call standard delete RPC if available, or just fail safely for now if not
      // We added delete_own_account RPC
      const { error } = await supabase.rpc('delete_own_account');

      if (error) throw error;

      await supabase.auth.signOut();
      navigate('/');
      showSuccess('Your account has been deleted.');
    } catch (error: any) {
      console.error('Delete account error:', error);
      showError(`Failed to delete account: ${error.message}`);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Use the central subscription hook for Realtime updates
  const { isPremium } = useSubscription();

  if (isLoading) {
    return (
      <div className="w-full px-4 py-10 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-8 py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <AvatarSelector
              currentAvatarUrl={profile?.avatar_url || null}
              userId={profile?.id || ''}
              onAvatarUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['userProfile'] });
                refreshAuthProfile(); // Refresh global auth state (header avatar)
              }}
            >
              <div className="relative cursor-pointer transition-transform active:scale-95 group-hover:ring-2 ring-primary ring-offset-2 rounded-full">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-border shadow-sm">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.display_name || 'User'} />
                  <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                    {profile?.display_name?.substring(0, 2).toUpperCase() || 'US'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-3 w-3" />
                </div>
              </div>
            </AvatarSelector>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold">{profile?.display_name || 'Profile'}</h1>
              {profile?.is_admin && <AdminBadge className="h-6 text-xs" />}
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 mb-2 font-medium opacity-80">
              <Mail className="h-3.5 w-3.5" />
              <span>{user?.email}</span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              {isPremium ? (
                <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 text-[10px] font-bold uppercase tracking-wider shadow-sm border border-yellow-400/50 flex items-center gap-1">
                  <Crown className="h-3 w-3" /> <span>PRO MEMBER</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Free Plan</span>
              )}
            </div>
          </div>
        </div>
      </div >

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card border-white/20 shadow-premium rounded-[2.5rem]">
            <CardHeader>
              <h2 className="text-xl font-semibold leading-none tracking-tight">Public Profile Details</h2>
              <CardDescription>This information may be visible to other users if your profile is set to public.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Location
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="City, Country" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Info className="h-4 w-4" /> Bio
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us a little about yourself (study goals, interests...)"
                            className="resize-none"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>Max 200 characters.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" /> Website
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://yourwebsite.com" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      Social Handles
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="twitter_handle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 font-normal text-muted-foreground">
                              <Twitter className="h-3 w-3" /> Twitter @
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="username" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="instagram_handle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 font-normal text-muted-foreground">
                              <Instagram className="h-3 w-3" /> Instagram @
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="username" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <FormField
                      control={form.control}
                      name="is_public_profile"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 w-full">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Visibility</FormLabel>
                            <FormDescription>
                              Make your profile and study sets visible to the community.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" size="lg" className="px-8 shadow-md">
                      Save Profile Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card shadow-premium rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-200/50">
            <CardHeader>
              <h2 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-indigo-600" /> Your Impact
              </h2>
              <CardDescription>Learning statistics and milestones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-sm border shadow-sm flex flex-col items-center text-center transition-colors">
                  <LayoutGrid className="h-5 w-5 mb-2 text-blue-500" />
                  <span className="text-2xl font-bold">{profile?.stats?.total_sets || 0}</span>
                  <p className="text-[10px] uppercase tracking-wider font-black text-muted-foreground">Study Sets</p>
                </div>
                <div className="p-4 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-sm border shadow-sm flex flex-col items-center text-center transition-colors">
                  <Trophy className="h-5 w-5 mb-2 text-amber-500" />
                  <span className="text-2xl font-bold">{profile?.stats?.mastered_cards || 0}</span>
                  <p className="text-[10px] uppercase tracking-wider font-black text-muted-foreground">Cards Mastered</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-600 text-white shadow-lg flex flex-col items-center text-center">
                <span className="text-sm font-medium opacity-80 mb-1">Current Status</span>
                <span className="text-lg font-bold flex items-center gap-2">
                  {isPremium ? (
                    <><Crown className="h-5 w-5 text-amber-300" /> Pro Member</>
                  ) : (
                    "Free Member"
                  )}
                </span>
                {!isPremium && (
                  <Button variant="secondary" size="sm" className="mt-4 w-full" asChild>
                    <Link to="/pricing">Upgrade Now</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>


          <Card className="glass-card shadow-premium rounded-[2.5rem] bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border-indigo-200/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" /> My Achievements
                </h2>
                <CardDescription>Badges earned from your learning journey.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <BadgeListWrapper userId={user?.id} />
            </CardContent>
          </Card>

          <Card className="glass-card border-white/20 shadow-premium rounded-[2.5rem]">
            <CardHeader>
              <h2 className="text-xl font-semibold leading-none tracking-tight">Quick Links</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/settings">
                <Button variant="outline" className="w-full justify-start hover:bg-slate-50 transition-colors">
                  <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" className="w-full justify-start hover:bg-slate-50 transition-colors">
                  <BarChart2 className="mr-2 h-4 w-4" /> Activity Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-premium rounded-[2.5rem] border-red-100 bg-red-50/5">
            <CardHeader>
              <h2 className="text-xl font-semibold leading-none tracking-tight text-destructive">Danger Zone</h2>
              <CardDescription>Permanently delete your account and all data.</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full shadow-sm" disabled={isDeletingAccount}>
                    {isDeletingAccount ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete Account
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
                      disabled={true}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Confirm Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  );
};

export default Profile;