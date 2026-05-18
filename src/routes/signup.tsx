import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Sparkles, Loader2, Eye, EyeOff, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <ParticleBackground />
        <div className="w-full max-w-sm z-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bullish/20 border border-bullish/40 mx-auto mb-6">
            <Check className="h-8 w-8 text-bullish" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-sm text-muted-foreground mb-6">
            We sent a confirmation link to <span className="text-foreground font-medium">{email}</span>.<br />
            Click it to activate your account and start your <span className="text-primary font-semibold">3-day free trial</span>.
          </p>
          <Link to="/login" className="text-sm text-primary hover:text-primary/80 transition">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <ParticleBackground />
      <div className="w-full max-w-sm z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/40 glow-primary-sm mb-4">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Start your free trial</h1>
          <p className="text-sm text-muted-foreground mt-1">3 days full access · No card required</p>
        </div>

        <form onSubmit={handleSignup} className="glass-strong rounded-2xl p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg glass border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 placeholder:text-muted-foreground/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full rounded-lg glass border border-border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 placeholder:text-muted-foreground/40"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Trial highlights */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs space-y-1.5 text-muted-foreground">
            {["3 days full access — all features", "After trial: 1 free analysis/day", "Cancel anytime — no hidden fees"].map((t) => (
              <div key={t} className="flex items-center gap-2"><Check className="h-3 w-3 text-primary flex-shrink-0" />{t}</div>
            ))}
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-primary to-primary/70 py-3 text-sm font-semibold text-primary-foreground glow-primary-sm hover:glow-primary transition flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Create account
          </button>

          <p className="text-center text-xs text-muted-foreground">
            By signing up you agree to our Terms of Service
          </p>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
