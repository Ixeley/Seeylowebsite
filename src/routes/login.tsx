import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Sparkles, Mail, ArrowRight, RefreshCw, Chrome, Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Seeylo AI" }] }),
  component: LoginPage,
});

type Step = "email" | "otp" | "password";

function LoginPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpRefs = [
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
  ];

  // Redirect if already logged in with profile
  useEffect(() => {
    if (user && profile) navigate({ to: "/analyze" });
    else if (user && !profile) navigate({ to: "/onboard" });
  }, [user, profile]);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const sendOTP = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) { toast.error("Enter a valid email address"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setStep("otp");
    setResendCountdown(60);
    toast.success("Verification code sent!", { description: `Check ${trimmed}` });
  };

  const verifyOTP = async () => {
    const code = otp.join("");
    if (code.length !== 8) { toast.error("Enter the 8-digit code"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: "email",
    });
    if (error) {
      setLoading(false);
      toast.error("Invalid or expired code", { description: "Request a new one" });
      return;
    }
    // Check if new user (no profile yet) or returning
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user!.id)
      .single();

    setLoading(false);
    if (!profileData) {
      // New user — go to password step first, then onboard
      setStep("password");
    } else {
      navigate({ to: "/analyze" });
    }
  };

  const setPasswordAndContinue = async () => {
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/onboard" });
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/onboard` },
    });
    if (error) { toast.error(error.message); setLoading(false); }
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs[i - 1].current?.focus();
  };

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 7) otpRefs[i + 1].current?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (text.length === 8) {
      setOtp(text.split(""));
      otpRefs[7].current?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <ParticleBackground />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/40 glow-primary flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Seeylo AI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "email" && "Sign in or create an account"}
            {step === "otp" && "Enter verification code"}
            {step === "password" && "Set your password"}
          </p>
        </div>

        <div className="glass-strong rounded-2xl p-6 border border-border/60">

          {/* ── Step 1: Email ────────────────────────── */}
          {step === "email" && (
            <div className="space-y-4">
              {/* Google */}
              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-border glass px-4 py-3 text-sm font-semibold hover:border-primary/40 hover:bg-primary/5 transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>

              {/* Email */}
              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendOTP()}
                    placeholder="your@email.com"
                    className="w-full rounded-xl glass border border-border pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                    autoFocus
                  />
                </div>
                <button
                  onClick={sendOTP}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 px-4 py-3 text-sm font-semibold text-primary-foreground glow-primary-sm hover:glow-primary transition disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Send verification code
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                By continuing you agree to our{" "}
                <a href="#" className="text-primary hover:underline">Terms</a>{" "}
                and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </div>
          )}

          {/* ── Step 2: OTP ──────────────────────────── */}
          {step === "otp" && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center mx-auto mb-3">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  We sent an 8-digit code to<br />
                  <span className="text-foreground font-semibold">{email}</span>
                </p>
              </div>

              {/* OTP inputs */}
              <div className="flex gap-1.5 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKey(i, e)}
                    className={`h-11 w-9 rounded-lg border text-center text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/60 transition glass ${
                      digit ? "border-primary text-foreground" : "border-border text-muted-foreground"
                    }`}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                onClick={verifyOTP}
                disabled={loading || otp.join("").length !== 8}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 px-4 py-3 text-sm font-semibold text-primary-foreground glow-primary-sm hover:glow-primary transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Verifying..." : "Verify code"}
              </button>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button onClick={() => setStep("email")} className="hover:text-foreground transition">
                  ← Change email
                </button>
                <button
                  onClick={() => { sendOTP(); }}
                  disabled={resendCountdown > 0}
                  className="flex items-center gap-1 hover:text-foreground transition disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Password ─────────────────────── */}
          {step === "password" && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-sm text-muted-foreground">
                  Set a password so you can sign in<br />with email + password next time.
                </p>
              </div>

              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setPasswordAndContinue()}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl glass border border-border px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {password && (
                <PasswordStrength password={password} />
              )}

              <button
                onClick={setPasswordAndContinue}
                disabled={loading || password.length < 8}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 px-4 py-3 text-sm font-semibold text-primary-foreground glow-primary-sm hover:glow-primary transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-bearish", "bg-orange-400", "bg-yellow-400", "bg-bullish"];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i < score ? colors[score - 1] : "bg-muted"}`} />
        ))}
      </div>
      <p className={`text-xs ${colors[score - 1]?.replace("bg-", "text-") ?? "text-muted-foreground"}`}>
        {labels[score - 1] ?? "Too short"}
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
