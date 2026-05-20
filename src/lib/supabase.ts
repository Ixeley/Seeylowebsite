import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

export interface Profile {
  id: string;
  username: string;
  plan: "free" | "basic" | "pro" | "platinum";
  created_at: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data ?? null;
}

export async function checkUsername(username: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username.toLowerCase().trim())
    .single();
  return !!data;
}

export async function createProfile(userId: string, username: string): Promise<void> {
  await supabase.from("profiles").insert({
    id: userId,
    username: username.toLowerCase().trim(),
    plan: "free",
  });
}
