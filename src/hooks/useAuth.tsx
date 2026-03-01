"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define the structure for the user profile
interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_premium: boolean;
  subscription_status?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  twitter_handle?: string | null;
  instagram_handle?: string | null;
  is_public_profile?: boolean;
  terms_accepted_at?: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSessionAndProfile = async () => {
    // Keep loading true only on initial load or critical auth changes
    // for manual refreshes we might not want to set full global loading
    // but for simplicity we'll keep it as is or maybe optimize later. 
    // Actually, setting loading=true flickers the UI. Let's make it optional.
    // For now, I'll allow this function to be called from the context.

    // We need to re-fetch session to be safe, or just use existing.
    // Let's use getSession to be safe.
    const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error fetching session:", sessionError);
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    setSession(currentSession);
    setUser(currentSession?.user || null);

    if (currentSession?.user) {
      const [profileRes, subRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, avatar_url, is_admin, bio, location, website, twitter_handle, instagram_handle, is_public_profile, terms_accepted_at')
          .eq('id', currentSession.user.id)
          .single(),
        supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', currentSession.user.id)
          .maybeSingle()
      ]);

      const userProfile = profileRes.data;
      const subscription = subRes.data;

      if (profileRes.error && profileRes.error.code !== 'PGRST116') {
        console.error("Error fetching user profile:", profileRes.error);
      }

      // Admin always gets premium status
      const isPremium = subscription?.status === 'active' || subscription?.status === 'trialing' || !!userProfile?.is_admin;

      if (userProfile) {
        setProfile({
          id: userProfile.id,
          display_name: userProfile.display_name,
          avatar_url: userProfile.avatar_url,
          is_admin: userProfile.is_admin === true, // Strict verify
          bio: userProfile.bio,
          location: userProfile.location,
          website: userProfile.website,
          twitter_handle: userProfile.twitter_handle,
          instagram_handle: userProfile.instagram_handle,
          is_public_profile: userProfile.is_public_profile ?? undefined,
          is_premium: isPremium,
          subscription_status: subscription?.status || null,
          terms_accepted_at: userProfile.terms_accepted_at
        });
      } else {
        setProfile({
          id: currentSession.user.id,
          display_name: currentSession.user.email?.split('@')[0] || null,
          avatar_url: null,
          is_admin: false,
          is_premium: isPremium,
          subscription_status: subscription?.status || null,
          terms_accepted_at: null
        });
      }
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, session?.user?.email);

      if (event === 'PASSWORD_RECOVERY') {
        console.log("Password recovery event detected, checking current path...");
        // Only redirect if we're not already on the reset-password page
        // to avoid stripping the hash/search params during the redirect
        if (!window.location.pathname.startsWith('/reset-password')) {
          console.log("Not on reset-password page, redirecting...");
          window.location.href = '/reset-password' + window.location.hash + window.location.search;
        } else {
          console.log("Already on reset-password page, skipping manual redirect.");
        }
        // Still fetch profile to ensure useAuth consumers have the data
        fetchSessionAndProfile();
        return;
      }

      // Handle Initial Email Confirmation
      // When a user clicks 'Verify' in their email, they land with an access token
      // If we are on the root or dashboard but came from a confirmation link
      const hash = window.location.hash;
      if (event === 'SIGNED_IN' && hash.includes('type=signup')) {
        console.log("Email confirmation detected via hash, redirecting...");
        window.location.href = '/confirm-email';
        return;
      }

      fetchSessionAndProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, refreshProfile: fetchSessionAndProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};