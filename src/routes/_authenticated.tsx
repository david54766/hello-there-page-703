import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PhoneCall, LayoutDashboard, Settings as SettingsIcon, LogOut, TrendingUp, Users, Mic } from "lucide-react";

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
          CallRecover
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          <Link to="/dashboard" className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent [&.active]:bg-accent [&.active]:text-accent-foreground" activeProps={{ className: "active" }}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <Link to="/revenue" className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent [&.active]:bg-accent [&.active]:text-accent-foreground" activeProps={{ className: "active" }}>
            <TrendingUp className="h-4 w-4" /> Revenue
          </Link>
          <Link to="/team" className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent [&.active]:bg-accent [&.active]:text-accent-foreground" activeProps={{ className: "active" }}>
            <Users className="h-4 w-4" /> Team
          </Link>
          <Link to="/voice-test" className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent [&.active]:bg-accent [&.active]:text-accent-foreground" activeProps={{ className: "active" }}>
            <Mic className="h-4 w-4" /> Voice agent
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
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card/95 backdrop-blur md:hidden">
        {[
          { to: "/dashboard", icon: LayoutDashboard, label: "Leads" },
          { to: "/revenue", icon: TrendingUp, label: "Revenue" },
          { to: "/team", icon: Users, label: "Team" },
          { to: "/voice-test", icon: Mic, label: "Voice" },
          { to: "/settings", icon: SettingsIcon, label: "Settings" },
        ].map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] text-muted-foreground [&.active]:text-primary"
            activeProps={{ className: "active" }}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
