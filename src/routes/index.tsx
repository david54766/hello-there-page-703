import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/app-icon";
import {
  MessageSquareText, Sparkles, Shield, Clock, TrendingUp, CheckCircle2,
  PhoneMissed, Bot, ClipboardList, Send, BellRing, Wrench, Zap, BarChart3, Headset,
  DollarSign, Calculator, CreditCard, ArrowRight
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

const productScreens = [
  {
    src: "/homepage/app-forwarding.jpg",
    title: "Forward missed calls",
    body: "Carrier-aware setup shows the exact forwarding extension and fee notice.",
  },
  {
    src: "/homepage/app-transcript.jpg",
    title: "Capture the conversation",
    body: "AI and caller messages are separated so the job details are easy to review.",
  },
  {
    src: "/homepage/app-lead-actions.jpg",
    title: "Work every lead",
    body: "Call, play the recording, mark contacted, resolve, and review SMS history.",
  },
  {
    src: "/homepage/app-booking.jpg",
    title: "Schedule appointments",
    body: "Booked jobs and team assignments stay visible for follow-up.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <AppIcon />
            <span className="tracking-tight">CallRecover AI</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <a href="#pricing" className="hidden text-muted-foreground hover:text-foreground sm:inline">Pricing</a>
            <Link to="/login" className="text-muted-foreground hover:text-foreground">Sign In</Link>
            <Link to="/register">
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
            AI missed-call recovery for contractors
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto mt-6 max-w-3xl text-balance text-5xl font-semibold tracking-tight sm:text-6xl"
          >
            Stop losing jobs when you{" "}
            <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
              miss the phone.
            </span>{" "}
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
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-6 grid max-w-3xl gap-3 text-left sm:grid-cols-3"
          >
            {[
              ["One recovered job", "can cover the subscription"],
              ["AI answers fast", "when your crew is busy"],
              ["Lead details captured", "with transcript and priority"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--shadow-card)]">
                <div className="text-sm font-semibold">{label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{value}</div>
              </div>
            ))}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/register">
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
          <p className="mt-4 text-xs text-muted-foreground">5-minute setup. Works with your existing phone number. Cancel anytime.</p>
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

      {/* Product Screens */}
      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                Live mobile workflow
              </div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                See every missed-call recovery step.
              </h2>
              <p className="mt-4 text-muted-foreground">
                CallRecover keeps forwarding setup, AI transcript review, lead status,
                booking, and estimated revenue in one focused workflow.
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  "Show the exact missed-call forwarding code for the selected carrier.",
                  "Review the AI transcript, recording, SMS thread, and lead status.",
                  "Book follow-up appointments and keep recovered revenue visible.",
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--shadow-card)]">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative"
            >
              <div
                aria-hidden
                className="absolute inset-6 -z-10 rounded-[2rem] blur-3xl"
                style={{ background: "var(--gradient-primary)", opacity: 0.12 }}
              />
              <img
                src="/homepage/app-revenue.jpg"
                alt="CallRecover mobile recovered revenue dashboard"
                className="mx-auto w-full max-w-[340px] rounded-[2rem] border border-border bg-card object-cover shadow-[var(--shadow-elevated)]"
                loading="lazy"
              />
            </motion.div>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {productScreens.map((screen, i) => (
              <motion.article
                key={screen.src}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]"
              >
                <div className="aspect-[9/16] overflow-hidden border-b border-border bg-muted">
                  <img
                    src={screen.src}
                    alt={`CallRecover mobile app screen: ${screen.title}`}
                    className="h-full w-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{screen.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{screen.body}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ROI */}
      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-20 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Calculator className="h-3.5 w-3.5 text-primary" />
              Contractor math
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              One recovered call can pay for CallRecover.
            </h2>
            <p className="mt-4 text-muted-foreground">
              If one missed call turns into a normal $500 job, that single recovery covers
              the monthly subscription and leaves room for profit. Every additional job is upside.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/register">
                <Button className="gap-2">
                  Start recovering calls
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button variant="outline">View plans</Button>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-elevated)]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
              <div>
                <div className="text-sm text-muted-foreground">Example recovered job value</div>
                <div className="mt-1 text-4xl font-semibold tracking-tight">$500</div>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <DollarSign className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ["Starter", "$79/mo", "6.3x monthly subscription"],
                ["Pro", "$149/mo", "3.4x monthly subscription"],
                ["Scale", "$299/mo", "1.7x monthly subscription"],
              ].map(([name, price, coverage]) => (
                <div key={name} className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 p-4">
                  <div>
                    <div className="font-semibold">{name}</div>
                    <div className="text-sm text-muted-foreground">{price}</div>
                  </div>
                  <div className="text-right text-sm font-medium">{coverage}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Example assumes a $500 average job. Your actual value may be higher or lower based on trade and ticket size.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              Simple monthly plans
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pricing built around recovered jobs</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Plans include AI call minutes and SMS segments. Estimated call counts are based on a normal 3-minute contractor intake call.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {[
              {
                name: "Starter",
                price: "$79",
                calls: "Up to 50 recovered calls/mo",
                minutes: "150 AI minutes",
                sms: "400 SMS segments",
                fit: "For a single busy contractor line.",
                features: ["AI missed-call answering", "Lead inbox and transcripts", "SMS double opt-in", "One Vapi phone number"],
              },
              {
                name: "Pro",
                price: "$149",
                calls: "Up to 125 recovered calls/mo",
                minutes: "400 AI minutes",
                sms: "1,000 SMS segments",
                fit: "For growing teams that need routing and booking.",
                features: ["Everything in Starter", "Team routing", "Booking tools", "Priority lead alerts", "Website setup scan"],
                highlighted: true,
              },
              {
                name: "Scale",
                price: "$299",
                calls: "Up to 275 recovered calls/mo",
                minutes: "900 AI minutes",
                sms: "2,500 SMS segments",
                fit: "For high-volume teams with more automation headroom.",
                features: ["Everything in Pro", "Advanced reporting", "Higher usage allowance", "Multi-user operations", "Priority support"],
              },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`flex flex-col rounded-3xl border p-6 shadow-[var(--shadow-card)] ${
                  plan.highlighted ? "border-primary bg-background ring-2 ring-primary/10" : "border-border bg-background"
                }`}
              >
                {plan.highlighted && (
                  <div className="mb-4 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Most contractors start here
                  </div>
                )}
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="mt-2 min-h-10 text-sm text-muted-foreground">{plan.fit}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="pb-1 text-sm text-muted-foreground">/mo</span>
                </div>
                <div className="mt-5 rounded-2xl bg-muted/50 p-4">
                  <div className="font-semibold">{plan.calls}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{plan.minutes} - {plan.sms}</div>
                </div>
                <div className="mt-5 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              <Link to="/register" className="mt-auto pt-6">
                  <Button className="w-full" variant={plan.highlighted ? "default" : "outline"}>
                    Get started
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-background p-5 text-center text-sm text-muted-foreground">
            A single $500 recovered job covers Starter by more than 6x, Pro by more than 3x, and Scale by more than 1.5x.
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
          <Link to="/register" className="mt-6 inline-block">
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
