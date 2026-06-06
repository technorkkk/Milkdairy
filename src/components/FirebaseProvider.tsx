import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getBusinessProfile } from '../lib/data';

interface FirebaseContextType {
  user: User | null;
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

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (uid: string) => {
    try {
      const p = await getBusinessProfile(uid);
      setProfile(p);
      setError(null);
    } catch (e: any) {
      console.error("Failed to fetch profile", e);
      setError(e.message || "Failed to fetch profile");
    }
  };

  useEffect(() => {
    // Initial connection test
    const testConnection = async () => {
      try {
        // Just a ping to ensure we can talk to the database
        await getDocFromServer(doc(db, '_internal_', 'ping')).catch(() => {});
      } catch (err) {
        console.warn("Connection test failed", err);
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  return (
    <FirebaseContext.Provider value={{ user, profile, loading, error, refreshProfile }}>
      {children}
    </FirebaseContext.Provider>
  );
}
