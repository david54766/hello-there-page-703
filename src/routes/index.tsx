import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PhoneCall, MessageSquareText, Sparkles, Shield, Clock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "CallRecover AI — Recover Every Missed Call" },
      { name: "description", content: "AI voicemail transcription + instant SMS recovery built for contractors. Turn missed calls into booked jobs." },
    ],
  }),
});

function Landing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elevated)]">
              <PhoneCall className="h-4 w-4" />
            </span>
            <span className="tracking-tight">CallRecover AI</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link to="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60"
          style={{ background: "var(--gradient-subtle)" }}
        />
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 text-center sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm"
          >
            <Sparkles className="h-3 w-3 text-primary" />
            Built for contractors. Powered by AI.
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto mt-6 max-w-3xl text-balance text-5xl font-semibold tracking-tight sm:text-6xl"
          >
            Every missed call is a{" "}
            <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
              lost job.
            </span>{" "}
            Until now.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground"
          >
            CallRecover instantly engages every caller you miss — transcribing voicemails,
            qualifying leads, and texting them back before they hire your competitor.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/signup">
              <Button size="lg" className="h-12 px-6 text-base shadow-[var(--shadow-elevated)]">
                Start recovering calls
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="h-12 px-6 text-base">
                Sign in
              </Button>
            </Link>
          </motion.div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card. 5-minute setup.</p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-20 sm:grid-cols-3">
          {[
            { icon: Clock, title: "20-second pickup", body: "If you don't answer in 20s, AI takes over — captures the lead, never the silence." },
            { icon: MessageSquareText, title: "Instant SMS reply", body: "Mobile callers get a personalized text in seconds. Schedule, callback, or text — they choose." },
            { icon: TrendingUp, title: "Revenue recovered", body: "Dashboard shows exactly how much pipeline you would've lost. Every week." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="rounded-3xl border border-border bg-card p-12 shadow-[var(--shadow-elevated)]">
          <Shield className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Protect every job that calls.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Set up in minutes. Works with any carrier. Cancel anytime.
          </p>
          <Link to="/signup" className="mt-6 inline-block">
            <Button size="lg" className="h-12 px-8 text-base">Get started free</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-4xl space-y-3 px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} CallRecover AI</span>
            <Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms & Conditions</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookie Policy</Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to="/compliance" className="hover:text-foreground">SMS &amp; voice compliance</Link>
            <a href="https://www.twilio.com/legal/messaging-policy" target="_blank" rel="noreferrer" className="hover:text-foreground">Twilio messaging policy</a>
          </div>
          <p className="text-xs">
            SMS &amp; voice powered by Twilio. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.
          </p>
        </div>
      </footer>
    </main>
  );
}
