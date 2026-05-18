import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, getProfile, getSubscription, getTodayUsage, getDailyLimit, isTrialActive } from "@/lib/supabase";
import type { Profile, Subscription } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  subscription: Subscription | null;
  todayUsage: number;
  dailyLimit: number;
  trialActive: boolean;
  loading: boolean;
  refreshUsage: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, session: null, profile: null, subscription: null,
  todayUsage: 0, dailyLimit: 0, trialActive: false, loading: true,
  refreshUsage: async () => {}, refreshSubscription: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [todayUsage, setTodayUsage] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (u: User) => {
    const [p, s, usage] = await Promise.all([
      getProfile(u.id),
      getSubscription(u.id),
      getTodayUsage(u.id),
    ]);
    setProfile(p);
    setSubscription(s);
    setTodayUsage(usage);
  };

  const refreshUsage = async () => {
    if (user) setTodayUsage(await getTodayUsage(user.id));
  };

  const refreshSubscription = async () => {
    if (user) {
      const s = await getSubscription(user.id);
      setSubscription(s);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadUserData(s.user).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadUserData(s.user);
      else { setProfile(null); setSubscription(null); setTodayUsage(0); }
    });

    return () => sub.unsubscribe();
  }, []);

  const dailyLimit = getDailyLimit(subscription, profile);
  const trialActive = profile ? isTrialActive(profile) : false;

  return (
    <AuthContext.Provider value={{ user, session, profile, subscription, todayUsage, dailyLimit, trialActive, loading, refreshUsage, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
