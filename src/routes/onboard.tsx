import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase, checkUsername, createProfile } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Sparkles, CheckCircle2, XCircle, Loader2, AtSign, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/onboard")({
  head: () => ({ meta: [{ title: "Set up your account — Seeylo AI" }] }),
  component: OnboardPage,
});

function OnboardPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [taken, setTaken] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect if no user (not logged in) or already has profile
  useEffect(() => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (profile) { navigate({ to: "/analyze" }); }
  }, [user, profile]);

  const VALID = /^[a-zA-Z0-9_]{3,20}$/.test(username);

  useEffect(() => {
    if (!VALID) { setTaken(null); return; }
    setChecking(true);
    setTaken(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const isTaken = await checkUsername(username);
      setTaken(isTaken);
      setChecking(false);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username]);

  const handleSubmit = async () => {
    if (!user || !VALID || taken || checking) return;
    setSaving(true);
    try {
      await createProfile(user.id, username);
      await refreshProfile();
      toast.success("Welcome to Seeylo AI!", { description: `@${username.toLowerCase()} is yours` });
      navigate({ to: "/analyze" });
    } catch (err) {
      toast.error("Could not create profile", { description: err instanceof Error ? err.message : "Try again" });
    } finally {
      setSaving(false);
    }
  };

  const statusIcon = () => {
    if (!username || !VALID) return null;
    if (checking) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (taken === true) return <XCircle className="h-4 w-4 text-bearish" />;
    if (taken === false) return <CheckCircle2 className="h-4 w-4 text-bullish" />;
    return null;
  };

  const statusMsg = () => {
    if (!username) return null;
    if (!VALID) return <p className="text-xs text-muted-foreground">3–20 characters, letters, numbers and _ only</p>;
    if (checking) return <p className="text-xs text-muted-foreground">Checking availability…</p>;
    if (taken === true) return <p className="text-xs text-bearish">@{username.toLowerCase()} is already taken</p>;
    if (taken === false) return <p className="text-xs text-bullish">@{username.toLowerCase()} is available ✓</p>;
    return null;
  };

  const canSubmit = VALID && taken === false && !checking && !saving;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <ParticleBackground />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/40 glow-primary flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Almost there</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose your username</p>
        </div>

        <div className="glass-strong rounded-2xl p-6 border border-border/60 space-y-5">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/40 to-bullish/30 border border-primary/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-foreground">
                {username ? username[0].toUpperCase() : "?"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">
                {username ? `@${username.toLowerCase()}` : "Choose your handle"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Username input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="yourhandle"
                maxLength={20}
                className={`w-full rounded-xl glass border pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50 transition ${
                  taken === true ? "border-bearish/60" :
                  taken === false ? "border-bullish/60" :
                  "border-border"
                }`}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {statusIcon()}
              </div>
            </div>
            {statusMsg()}
            <p className="text-[11px] text-muted-foreground/60">You can change this later. Lowercase letters, numbers, and underscores.</p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 px-4 py-3 text-sm font-semibold text-primary-foreground glow-primary-sm hover:glow-primary transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {saving ? "Creating account…" : "Start analyzing charts"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            You're on the <span className="text-primary font-semibold">Free plan</span>. Upgrade anytime for unlimited analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
