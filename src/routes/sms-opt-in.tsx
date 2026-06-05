import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/sms-opt-in")({
  component: SmsOptInPage,
  head: () => ({
    meta: [
      { title: "SMS Opt-In · CallRecover" },
      {
        name: "description",
        content:
          "Sign up to receive SMS updates from CallRecover about your service request, appointment scheduling, and lead follow-up.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
});

function SmsOptInPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      toast.error("Please check the consent box to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/sms-opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, phone, consent: true }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Something went wrong. Please try again.");
      } else {
        setDone(true);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </Button>

      <h1 className="text-3xl font-semibold tracking-tight">SMS opt-in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Subscribe to receive SMS updates from CallRecover about your service
        request, appointment scheduling, and lead follow-up.
      </p>

      <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">How consent normally works:</strong> when
        you call a business using CallRecover and the call is forwarded to our AI
        voice agent, the agent collects your message and asks{" "}
        <em>verbally</em> if you'd like a text confirmation and priority callback. If
        you agree and called from a mobile number, we send one confirmation text and
        only continue messaging after you reply <strong>YES</strong> (double opt-in).
        Landline callers get a callback only — no SMS. This page is an alternative web
        opt-in for business owners and visitors who want to subscribe directly.
      </div>

      <Card className="mt-6 p-6">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <h2 className="text-lg font-semibold">You're subscribed</h2>
            <p className="text-sm text-muted-foreground">
              You will receive SMS updates at the number you provided. Reply
              STOP at any time to unsubscribe, or HELP for help.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile phone number</Label>
              <Input
                id="phone"
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>

            <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-1"
              />
              <Label htmlFor="consent" className="text-xs leading-relaxed font-normal text-muted-foreground">
                By checking this box and submitting, I agree to receive SMS
                messages from <strong>Classroom Panda LLC dba CallRecover</strong> related to my
                service request, appointment scheduling, and lead follow-up
                at the phone number provided. Message frequency varies.
                Message &amp; data rates may apply. Reply <strong>STOP</strong>{" "}
                to opt out, <strong>HELP</strong> for help. Consent is not a
                condition of purchase. See our{" "}
                <Link to="/privacy-policy" className="underline">privacy policy</Link>{" "}
                and{" "}
                <Link to="/terms" className="underline">terms</Link>.
              </Label>
            </div>

            <Button type="submit" disabled={submitting || !consent} className="w-full">
              {submitting ? "Submitting…" : "Subscribe to SMS updates"}
            </Button>

            <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Your information is used only to send the SMS updates you
              requested and is never sold or shared with third parties for
              marketing.
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}