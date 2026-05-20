import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, LogOut, User, ChevronDown, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth";

const PLAN_BADGE: Record<string, { label: string; cls: string }> = {
  free:     { label: "Free",     cls: "text-muted-foreground border-border" },
  basic:    { label: "Basic",    cls: "text-primary border-primary/40" },
  pro:      { label: "Pro",      cls: "text-yellow-400 border-yellow-400/40" },
  platinum: { label: "Platinum", cls: "text-violet-400 border-violet-400/40" },
};

export function Header() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate({ to: "/" });
  };

  const plan = profile?.plan ?? "free";
  const badge = PLAN_BADGE[plan];

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/40 glow-primary-sm group-hover:glow-primary transition-shadow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Seeylo<span className="text-gradient"> AI</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link to="/analyze" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Analyze</Link>
          <Link to="/dashboard" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Dashboard</Link>
          <Link to="/pricing" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Pricing</Link>
        </nav>

        {user && profile ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 rounded-xl glass border border-border px-3 py-2 text-sm hover:border-primary/40 transition"
            >
              {/* Avatar */}
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/60 to-bullish/40 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-foreground">{profile.username[0].toUpperCase()}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold leading-none">@{profile.username}</p>
                <p className={`text-[10px] mt-0.5 font-medium ${badge.cls.split(" ")[0]}`}>{badge.label}</p>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-52 glass-strong rounded-xl border border-border overflow-hidden shadow-xl">
                  <div className="px-4 py-3 border-b border-border/60">
                    <p className="text-sm font-semibold">@{profile.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                      {plan === "platinum" && <Crown className="h-2.5 w-2.5" />}
                      {badge.label} plan
                    </div>
                  </div>
                  <Link
                    to="/analyze"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5 transition"
                  >
                    <Sparkles className="h-4 w-4" /> Analyze Chart
                  </Link>
                  <Link
                    to="/pricing"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5 transition"
                  >
                    <Crown className="h-4 w-4" /> Upgrade Plan
                  </Link>
                  <div className="border-t border-border/60">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-bearish hover:bg-bearish/5 transition"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-primary to-primary/80 px-4 py-2 text-sm font-medium text-primary-foreground glow-primary-sm hover:glow-primary transition-all"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
