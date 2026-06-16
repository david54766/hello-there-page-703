import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendWelcomeEmail } from "@/lib/welcome-email.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/password-input";
import { toast } from "sonner";
import { AppIcon } from "@/components/app-icon";
import { Globe2, TimerReset } from "lucide-react";

export const Route = createFileRoute("/signup")({ component: Signup });

function normalizeWebsite(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function Signup() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const normalizedWebsite = normalizeWebsite(website);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/onboarding",
        data: {
          business_name: businessName.trim(),
          website: normalizedWebsite,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);

    sendWelcomeEmail({ data: { email } }).catch((error) =>
      console.warn("welcome email failed", error),
    );
    toast.success("Trial account created. Check your email to confirm.");
    navigate({ to: "/onboarding" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-subtle)] p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <AppIcon />
          CallRecover AI
        </Link>
        <Card className="p-8 shadow-[var(--shadow-card)]">
          <div className="mb-5 flex items-center gap-3 rounded-2xl border bg-muted/40 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <TimerReset className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Start recovering missed calls free</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Includes 15 minutes of AI call handling. No credit card. We scan your site to speed up setup.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="business">Business name</Label>
              <Input
                id="business"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Apex Roofing"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website URL <span className="text-muted-foreground">(optional)</span></Label>
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create free account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign In</Link>
          </p>
          <p className="mt-3 text-center text-[11px] leading-snug text-muted-foreground">
            By creating an account you agree that CallRecover AI may send SMS and place calls on
            your business's behalf via Twilio in line with our{" "}
            <Link to="/compliance" className="underline">SMS &amp; Voice Compliance</Link>{" "}
            policy. Standard carrier rates apply. Reply STOP to opt out, HELP for help.
          </p>
        </Card>
      </div>
    </main>
  );
}
