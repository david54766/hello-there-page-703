import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  PhoneCall, MessageSquareText, Sparkles, Shield, Clock, TrendingUp, CheckCircle2,
  PhoneMissed, Bot, ClipboardList, Send, BellRing, Wrench, Zap, BarChart3, Headset, Settings2
} from "lucide-react";
import { AI_VERBAL_SMS_OPT_IN_PROMPT, DOUBLE_OPT_IN_CONFIRMATION_SMS } from "@/lib/sms-consent-copy";

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
            <Link to="/login" className="text-muted-foreground hover:text-foreground">Sign In</Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
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
                Start Recovering Calls
              </Button>
            </Link>
            <Link to="/sms-opt-in">
              <Button size="lg" variant="secondary" className="h-12 px-6 text-base gap-2">
                <MessageSquareText className="h-4 w-4" />
                Subscribe to SMS Updates
              </Button>
            </Link>
          </motion.div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card. 5-minute setup.</p>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              From missed call to booked job in under a minute. No apps to install.
            </p>
          </motion.div>

          <div className="relative mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-5">
            {/* Connector line (desktop) */}
            <div
              aria-hidden
              className="absolute left-0 right-0 top-[2.25rem] hidden h-0.5 sm:block"
              style={{ background: "var(--gradient-primary)", opacity: 0.2, margin: "0 2.5rem" }}
            />

            {[
              {
                icon: PhoneMissed,
                title: "Missed call",
                body: "You're on a job, driving, or it's after hours. The caller gets silence.",
              },
              {
                icon: Bot,
                title: "AI answers",
                body: "Our voice agent picks up in 20 seconds, introduces itself, and takes a detailed message.",
              },
              {
                icon: ClipboardList,
                title: "Lead qualified",
                body: "AI asks what they need, when they need it, and logs every detail in your dashboard.",
              },
              {
                icon: Send,
                title: "SMS sent",
                body: "The caller gets an instant text with your info and next steps — before they call a competitor.",
              },
              {
                icon: BellRing,
                title: "You close it",
                body: "You get notified with a hot, pre-qualified lead. Call back and book the job.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative z-10 text-center"
              >
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-background text-primary shadow-[var(--shadow-card)]">
                  <span className="text-sm font-bold">{i + 1}</span>
                </div>
                <div className="mt-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <step.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">What you get</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Built for contractors who can't afford to miss another job.
            </p>
          </motion.div>

          <div className="mx-auto mt-12 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Clock,
                title: "20-second AI pickup",
                value: "Never lose a caller to voicemail again. If you don't answer, AI takes over instantly.",
              },
              {
                icon: MessageSquareText,
                title: "Instant SMS follow-up",
                value: "Callers get a personalized text in seconds with your contact info and next steps.",
              },
              {
                icon: BarChart3,
                title: "Revenue you can see",
                value: "Dashboard shows exactly how many leads and how much pipeline you've recovered — weekly.",
              },
              {
                icon: Headset,
                title: "Zero hardware or apps",
                value: "Works with your existing phone number. No devices to buy, no software to install.",
              },
              {
                icon: Zap,
                title: "5-minute setup",
                value: "Forward your missed calls to us. That's it. Most contractors are live before their coffee cools.",
              },
              {
                icon: Wrench,
                title: "Built for trades",
                value: "HVAC, plumbing, electrical, roofing — AI speaks the language of your industry and your customers.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How We Message You */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          <MessageSquareText className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">How we message you</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            CallRecover only texts callers after they've explicitly opted in. Consent
            to receive SMS messages is not required to receive a callback, schedule
            service, or complete any transaction. You will receive a callback from
            the business regardless of whether you agree to text messages.
          </p>

          <div className="mx-auto mt-6 max-w-2xl space-y-3 text-left">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">1. Call is forwarded to our AI agent</p>
              <p className="mt-1">
                When the business misses your call, it forwards to our AI voice agent.
                The agent takes your message and reason for calling so the business
                can call you back with the right details.
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">2. Optional SMS consent on the call</p>
              <p className="mt-1 italic">"{AI_VERBAL_SMS_OPT_IN_PROMPT}"</p>
              <p className="mt-2">Your verbal response is recorded as proof of consent.</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">3. Confirmation text (double opt-in)</p>
              <p className="mt-1">If you agreed verbally and called from a mobile number, we send one text:</p>
              <p className="mt-2 italic">"{DOUBLE_OPT_IN_CONFIRMATION_SMS}"</p>
              <p className="mt-2">We only continue messaging after you reply YES.</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">No SMS required for service</p>
              <p className="mt-1">
                If you decline SMS or cannot receive text messages, no SMS is sent.
                Your message is still logged and the business will call you back.
              </p>
            </div>
          </div>

          <ul className="mx-auto mt-6 inline-block text-left text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary shrink-0" />
              <span>Two-layer consent: verbal on the call + <strong>YES</strong> reply to the text.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary shrink-0" />
              <span>SMS consent is optional and never required for callback, scheduling, service, or any transaction.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary shrink-0" />
              <span>Message frequency varies. Message &amp; data rates may apply.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary shrink-0" />
              <span>Reply <strong>STOP</strong> to opt out, <strong>HELP</strong> for help at any time.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                See our <Link to="/privacy-policy" className="underline">privacy policy</Link>{" "}
                and <Link to="/terms" className="underline">terms</Link> for full details.
              </span>
            </li>
          </ul>
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
            <Button size="lg" className="h-12 px-8 text-base">Get Started Free</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-4xl space-y-3 px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} Classroom Panda LLC dba CallRecover</span>
            <Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms & Conditions</Link>
            <Link to="/cookies" className="hover:text-foreground">Cookie Policy</Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to="/compliance" className="hover:text-foreground">SMS &amp; Voice Compliance</Link>
            <Link to="/sms-opt-in" className="hover:text-foreground">SMS Opt-In</Link>
            <a href="https://www.twilio.com/legal/messaging-policy" target="_blank" rel="noreferrer" className="hover:text-foreground">Twilio Messaging Policy</a>
          </div>
          <p className="text-xs">
            SMS &amp; voice powered by Twilio. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.
          </p>
        </div>
      </footer>
    </main>
  );
}
