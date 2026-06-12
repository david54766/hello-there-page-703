import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AppIcon } from "@/components/app-icon";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function prepareRecoverySession() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashError = hash.get("error_description") || hash.get("error");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (hashError) {
        if (mounted) setLinkError(hashError);
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!mounted) return;
        if (error) {
          setLinkError(error.message);
          return;
        }
        window.history.replaceState({}, document.title, "/reset-password");
        setReady(true);
        return;
      }

      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (!mounted) return;
        if (error) {
          setLinkError(error.message);
          return;
        }
        window.history.replaceState({}, document.title, "/reset-password");
        setReady(true);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!mounted) return;
        if (error) {
          setLinkError(error.message);
          return;
        }
        window.history.replaceState({}, document.title, "/reset-password");
        setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (mounted && data.session) setReady(true);
    }

    // Supabase may put a recovery session in the URL hash, or a code in the query string.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    prepareRecoverySession();
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. You're signed in.");
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-subtle)] p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <AppIcon />
          CallRecover AI
        </Link>
        <Card className="p-8 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a strong password you haven't used before.
          </p>
          {!ready ? (
            <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {linkError || "Open this page from the reset link in your email. If the link expired, request a new one."}
              <div className="mt-3">
                <Link to="/forgot-password" className="font-medium text-primary hover:underline">
                  Request a new link
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
