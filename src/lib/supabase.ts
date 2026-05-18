import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  email: string;
  created_at: string;
  trial_started_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "basic" | "pro" | "platinum" | null;
  billing_period: "weekly" | "monthly" | "yearly" | null;
  status: "active" | "canceled" | "past_due" | "trialing" | null;
  current_period_end: string | null;
}

export interface UsageRecord {
  user_id: string;
  date: string;
  analysis_count: number;
}

const TRIAL_DAYS = 3;
const FREE_DAILY_LIMIT = 1;
export const PLAN_LIMITS: Record<string, number> = {
  basic: 2,
  pro: 10,
  platinum: 20,
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data } = await supabase.from("subscriptions").select("*").eq("user_id", userId).single();
  return data;
}

export async function getTodayUsage(userId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("usage")
    .select("analysis_count")
    .eq("user_id", userId)
    .eq("date", today)
    .single();
  return data?.analysis_count ?? 0;
}

export async function incrementUsage(userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await supabase.rpc("increment_usage", { p_user_id: userId, p_date: today });
}

export function isTrialActive(profile: Profile): boolean {
  const trialStart = new Date(profile.trial_started_at);
  const now = new Date();
  const diffDays = (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < TRIAL_DAYS;
}

export function getDailyLimit(subscription: Subscription | null, profile: Profile | null): number {
  if (!profile) return 0;
  if (subscription?.status === "active" && subscription.plan) {
    return PLAN_LIMITS[subscription.plan] ?? FREE_DAILY_LIMIT;
  }
  if (isTrialActive(profile)) return 20; // full access during trial
  return FREE_DAILY_LIMIT;
}

export function isSubscribed(subscription: Subscription | null): boolean {
  return subscription?.status === "active";
}
