import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { acceptTeamMemberInvite } from "@/lib/team-invites.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppIcon } from "@/components/app-icon";
import { toast } from "sonner";

export const Route = createFileRoute("/accept-team-invite")({
  component: AcceptTeamInvite,
});

function AcceptTeamInvite() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch() as { token?: string };
  const acceptInvite = useServerFn(acceptTeamMemberInvite);
  const [accepting, setAccepting] = useState(false);
  const token = search.token ?? "";

  async function accept() {
    if (!token) return toast.error("Invite token is missing.");
    setAccepting(true);
    try {
      await acceptInvite({ data: { token } });
      toast.success("Team access connected.");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not accept invite");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-subtle)] p-6">
      <Card className="w-full max-w-md p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mb-6 flex justify-center">
          <AppIcon />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Accept team invite</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This connects your login to the team-member dashboard for assigned calls and scheduling.
        </p>
        {!token ? (
          <p className="mt-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">This invite link is missing its token.</p>
        ) : loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Checking sign-in...</p>
        ) : !user ? (
          <div className="mt-6 space-y-3">
            <Button asChild className="w-full">
              <Link to="/login" search={{ redirect: `/accept-team-invite?token=${encodeURIComponent(token)}` } as any}>
                Sign in to accept
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/signup">Create account first</Link>
            </Button>
          </div>
        ) : (
          <Button onClick={accept} disabled={accepting} className="mt-6 w-full">
            {accepting ? "Connecting..." : "Accept invite"}
          </Button>
        )}
      </Card>
    </main>
  );
}
