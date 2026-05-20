import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PhoneCall, LayoutDashboard, Settings as SettingsIcon, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

function Layout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen bg-[image:var(--gradient-subtle)]">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card/60 p-4 md:flex md:flex-col">
        <Link to="/" className="mb-8 flex items-center gap-2 font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
            <PhoneCall className="h-4 w-4" />
          </span>
          CallRescue
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          <Link to="/dashboard" className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent [&.active]:bg-accent [&.active]:text-accent-foreground" activeProps={{ className: "active" }}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <Link to="/settings" className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent [&.active]:bg-accent [&.active]:text-accent-foreground" activeProps={{ className: "active" }}>
            <SettingsIcon className="h-4 w-4" /> Settings
          </Link>
        </nav>
        <div className="mt-auto">
          <div className="mb-2 truncate text-xs text-muted-foreground">{user.email}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>
            <LogOut className="h-3 w-3" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
