import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, PLAN_LIMITS } from "@/lib/supabase";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { User, CreditCard, Zap, LogOut, ArrowRight, Check, Crown, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, subscription, todayUsage, dailyLimit, trialActive, loading } = useAuth();
  const navigate = useNavigate();
  const search = new URLSearchParams(window.location.search);
  const checkoutSuccess = search.get("checkout") === "success";

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (checkoutSuccess) toast.success("Subscription activated!", { description: "Your plan is now live." });
  }, [checkoutSuccess]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading || !user) return null;

  const plan = subscription?.status === "active" && subscription.plan ? subscription.plan as PlanKey : null;
  const planInfo = plan ? PLANS[plan] : null;

  const trialDaysLeft = profile
    ? Math.max(0, Math.ceil(3 - (Date.now() - new Date(profile.trial_started_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />

      <main className="container mx-auto px-6 py-12 max-w-xl">
        <h1 className="text-2xl font-bold mb-6">My Account</h1>

        {/* Account info */}
        <div className="glass-strong rounded-2xl p-5 mb-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{user.email}</p>
              <p className="text-xs text-muted-foreground">Member since {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
            <button onClick={handleSignOut} className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>

        {/* Usage today */}
        <div className="glass-strong rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Today's Usage</span>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold">{todayUsage}</span>
            <span className="text-muted-foreground mb-1">/ {dailyLimit} analyses</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${todayUsage >= dailyLimit ? "bg-bearish" : "bg-primary"}`}
              style={{ width: `${Math.min((todayUsage / Math.max(dailyLimit, 1)) * 100, 100)}%` }}
            />
          </div>
          {todayUsage >= dailyLimit && (
            <p className="text-xs text-bearish mt-2">Daily limit reached. <Link to="/pricing" className="underline">Upgrade</Link> for more.</p>
          )}
        </div>

        {/* Plan status */}
        <div className="glass-strong rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Subscription</span>
          </div>

          {plan && planInfo ? (
            <div className={`rounded-xl border ${planInfo.border} ${planInfo.bg} p-4`}>
              <div className={`flex items-center gap-2 font-bold ${planInfo.color} mb-1`}>
                {plan === "platinum" ? <Crown className="h-4 w-4" /> : plan === "pro" ? <Star className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                {planInfo.name} Plan
              </div>
              <p className="text-xs text-muted-foreground capitalize">{subscription?.billing_period} · {subscription?.status}</p>
              {subscription?.current_period_end && (
                <p className="text-xs text-muted-foreground mt-1">
                  Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
                {planInfo.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-bullish flex-shrink-0" />{f}
                  </div>
                ))}
              </div>
            </div>
          ) : trialActive ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="font-semibold text-primary text-sm mb-1">Free Trial Active</p>
              <p className="text-xs text-muted-foreground">{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining · Full access</p>
              <Link to="/pricing" className="mt-3 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition">
                Choose a plan before trial ends <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="font-semibold text-sm mb-1">Free tier</p>
              <p className="text-xs text-muted-foreground">1 analysis per day</p>
              <Link to="/pricing" className="mt-3 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition">
                Upgrade for more analyses <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        <Link to="/pricing" className="block w-full rounded-xl bg-gradient-to-r from-primary to-primary/70 py-3 text-sm font-semibold text-primary-foreground text-center glow-primary-sm hover:glow-primary transition">
          {plan ? "Change plan" : "Upgrade now"}
        </Link>
      </main>

      <Footer />
    </div>
  );
}
