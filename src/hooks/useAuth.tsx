"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define the structure for the user profile
interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean; // Added is_admin flag
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null; // Added user profile
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // New state for profile
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setLoading(true);
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
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, is_admin')
          .eq('id', currentSession.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("Error fetching user profile:", profileError);
          setProfile(null);
        } else if (userProfile) {
          setProfile(userProfile as UserProfile);
        } else {
          // If no profile found, set a default non-admin profile
          setProfile({
            id: currentSession.user.id,
            display_name: currentSession.user.email?.split('@')[0] || null,
            avatar_url: null,
            is_admin: false,
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // When auth state changes, re-fetch everything to ensure profile is up-to-date
      fetchSessionAndProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading }}>
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