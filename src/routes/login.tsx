import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { startChallenge, verifyChallenge } from "@/lib/mfa.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/password-input";
import { toast } from "sonner";
import { AppIcon } from "@/components/app-icon";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"creds" | "mfa">("creds");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [masked, setMasked] = useState<string>("");
  const [code, setCode] = useState("");
  const start = useServerFn(startChallenge);
  const verify = useServerFn(verifyChallenge);

  async function completeSignIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await start({ data: { email, password } });
      if (!res.ok) {
        toast.error("Invalid email or password");
        return;
      }
      if (!res.mfaRequired) {
        await completeSignIn();
        return;
      }
      setChallengeId(res.challengeId);
      setMasked(res.masked);
      setStage("mfa");
      toast.success(`Verification code sent to ${res.masked}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeId) return;
    setLoading(true);
    try {
      await verify({ data: { challengeId, code } });
      await completeSignIn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-subtle)] p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <AppIcon />
          CallRecover AI
        </Link>
        <Card className="p-8 shadow-[var(--shadow-card)]">
          {stage === "creds" ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
              <p className="mt-1 text-sm text-muted-foreground">Sign in to your dashboard</p>
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Checking…" : "Continue"}
            </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">Two-factor authentication</h1>
              <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to {masked}. It expires in 10 minutes.</p>
              <form onSubmit={onVerify} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Verification code</Label>
                  <Input id="code" inputMode="numeric" pattern="\d{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus />
                </div>
                <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                  {loading ? "Verifying…" : "Verify & sign in"}
                </Button>
                <button type="button" onClick={() => { setStage("creds"); setCode(""); setChallengeId(null); }} className="block w-full text-center text-xs text-muted-foreground hover:underline">
                  Back to sign-in
                </button>
              </form>
            </>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">Sign up</Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
