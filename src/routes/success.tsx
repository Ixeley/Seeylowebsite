import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";

export const Route = createFileRoute("/success")({
  head: () => ({
    meta: [{ title: "Payment successful — Seeylo AI" }],
  }),
  component: Success,
});

function Success() {
  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />
      <main className="container mx-auto px-6 py-32 flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-full bg-bullish/15 border border-bullish/40 flex items-center justify-center mb-6 glow-bullish">
          <CheckCircle2 className="h-10 w-10 text-bullish" />
        </div>
        <h1 className="text-4xl font-bold text-gradient mb-3">You're all set!</h1>
        <p className="text-muted-foreground max-w-md">
          Your subscription is active. Start analyzing charts and get your edge in the market.
        </p>
        <Link
          to="/analyze"
          className="mt-10 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 px-7 py-3.5 text-sm font-semibold text-primary-foreground glow-primary hover:scale-[1.03] transition-transform"
        >
          Analyze your first chart
          <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
      <Footer />
    </div>
  );
}
