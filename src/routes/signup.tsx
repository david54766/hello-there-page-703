import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { PhoneCall } from "lucide-react";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/onboarding" },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your email to confirm.");
    navigate({ to: "/onboarding" });
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/onboarding" });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-subtle)] p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
            <PhoneCall className="h-4 w-4" />
          </span>
          CallRecover AI
        </Link>
        <Card className="p-8 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-semibold tracking-tight">Start protecting calls</h1>
          <p className="mt-1 text-sm text-muted-foreground">Free to start. No credit card.</p>
          <Button variant="outline" className="mt-6 w-full" onClick={google} type="button">
            Continue with Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
          <p className="mt-3 text-center text-[11px] leading-snug text-muted-foreground">
            By creating an account you agree that CallRecover AI may send SMS and place calls on
            your business's behalf via Twilio in line with our{" "}
            <Link to="/compliance" className="underline">SMS &amp; voice compliance</Link>{" "}
            policy. Standard carrier rates apply. Reply STOP to opt out, HELP for help.
          </p>
        </Card>
      </div>
    </main>
  );
}
