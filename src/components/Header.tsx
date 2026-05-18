import { Link } from "@tanstack/react-router";
import { Sparkles, User, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/40 glow-primary-sm group-hover:glow-primary transition-shadow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Seeylo<span className="text-gradient-primary"> AI</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link to="/analyze" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Analyze</Link>
          <Link to="/dashboard" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Dashboard</Link>
          <Link to="/pricing" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Pricing</Link>
        </nav>
        {!loading && (
          user ? (
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 rounded-lg glass border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user.email?.split("@")[0]}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center rounded-lg bg-gradient-to-r from-primary to-primary/80 px-4 py-2 text-sm font-medium text-primary-foreground glow-primary-sm hover:glow-primary transition-all"
              >
                Start free trial
              </Link>
            </div>
          )
        )}
      </div>
    </header>
  );
}
