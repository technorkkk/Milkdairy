import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getBusinessProfile } from '../lib/data';

// Compatible user interface that maps Supabase User to the same shape
// that components expect (uid, email, displayName, etc.)
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerData: { providerId: string }[];
}

function mapSupabaseUser(sbUser: SupabaseUser | null): AuthUser | null {
  if (!sbUser) return null;
  const meta = sbUser.user_metadata || {};
  return {
    uid: sbUser.id,
    email: sbUser.email ?? null,
    displayName: meta.full_name || meta.name || meta.preferred_username || sbUser.email?.split('@')[0] || null,
    photoURL: meta.avatar_url || meta.picture || null,
    providerData: sbUser.app_metadata?.provider
      ? [{ providerId: sbUser.app_metadata.provider }]
      : [],
  };
}

interface FirebaseContextType {
  user: AuthUser | null;
  profile: any | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  refreshProfile: async () => {},
});

export const useFirebase = () => useContext(FirebaseContext);

const AUTH_TIMEOUT_MS = 8000; // 8 second max wait for auth

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const p = await getBusinessProfile(uid);
      setProfile(p);
      setError(null);
    } catch (e: any) {
      console.error("Failed to fetch profile", e);
      // Don't set error for profile fetch - user might not have profile yet
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      console.error('[Auth] Supabase client not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars.');
      setError('Supabase not configured. Please set environment variables.');
      setLoading(false);
      return;
    }

    let mounted = true;

    // Safety timeout: force loading to false after AUTH_TIMEOUT_MS
    // This prevents the app from getting stuck on splash screen forever
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[Auth] Auth check timed out after', AUTH_TIMEOUT_MS, 'ms - forcing loading to false');
        setLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    // Check for existing session first
    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[Auth] Session error:', sessionError);
        }
        if (!mounted) return;

        const mappedUser = mapSupabaseUser(session?.user ?? null);
        setUser(mappedUser);
        if (mappedUser) {
          await fetchProfile(mappedUser.uid);
        }
      } catch (err) {
        console.error('[Auth] Error getting session', err);
        if (!mounted) return;
        // Even if session check fails, allow the app to proceed
        setUser(null);
      } finally {
        if (mounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log('[Auth] State changed:', event);
        if (!mounted) return;

        const mappedUser = mapSupabaseUser(session?.user ?? null);
        setUser(mappedUser);

        if (mappedUser) {
          await fetchProfile(mappedUser.uid);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.uid);
  }, [user, fetchProfile]);

  return (
    <FirebaseContext.Provider value={{ user, profile, loading, error, refreshProfile }}>
      {children}
    </FirebaseContext.Provider>
  );
}
