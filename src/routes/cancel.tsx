import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";

export const Route = createFileRoute("/cancel")({
  head: () => ({
    meta: [{ title: "Payment cancelled — Seeylo AI" }],
  }),
  component: Cancel,
});

function Cancel() {
  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />
      <main className="container mx-auto px-6 py-32 flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-full bg-bearish/15 border border-bearish/40 flex items-center justify-center mb-6">
          <XCircle className="h-10 w-10 text-bearish" />
        </div>
        <h1 className="text-4xl font-bold mb-3">Payment cancelled</h1>
        <p className="text-muted-foreground max-w-md">
          No worries — you haven't been charged. You can upgrade whenever you're ready.
        </p>
        <Link
          to="/pricing"
          className="mt-10 inline-flex items-center gap-2 rounded-xl glass px-7 py-3.5 text-sm font-semibold hover:bg-muted/60 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to pricing
        </Link>
      </main>
      <Footer />
    </div>
  );
}
