import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/app-icon";
import {
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Phone,
  Settings as SettingsIcon,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { loadViewerAccess, type ViewerAccess } from "@/lib/viewer-access";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

const AGENT_RESTRICTED_PREFIXES = ["/revenue", "/billing", "/vapi", "/scripts", "/admin"];

function Layout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [viewer, setViewer] = useState<ViewerAccess | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setCheckingSetup(false);
      setIsPlatformAdmin(false);
      setViewer(null);
      return;
    }
    let cancelled = false;
    async function checkAccess() {
      const [access, { data: adminRow }] = await Promise.all([
        loadViewerAccess(supabase, user.id),
        (supabase as any)
          .from("platform_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const adminAccess = Boolean(adminRow?.user_id);
      const path = window.location.pathname;

      setViewer(access);
      setIsPlatformAdmin(adminAccess);
      setCheckingSetup(false);

      if (access?.isAgent && AGENT_RESTRICTED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
        navigate({ to: "/dashboard" });
        return;
      }

      if (access?.business && !access.business.onboarding_complete && access.canManageTenant && !adminAccess && path !== "/onboarding") {
        navigate({ to: "/onboarding" });
      }
    }
    checkAccess().catch(() => {
      if (!cancelled) setCheckingSetup(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loading, user, navigate]);

  if (loading || !user || checkingSetup) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: viewer?.isAgent ? "Dashboard" : "Dashboard" },
    ...(viewer?.isAgent
      ? []
      : [
          { to: "/revenue", icon: TrendingUp, label: "Revenue" },
          { to: "/billing", icon: CreditCard, label: "Billing" },
        ]),
    { to: "/team", icon: Users, label: "Team" },
    ...(viewer?.isAgent
      ? []
      : [
          { to: "/vapi", icon: Phone, label: "AI agent" },
          { to: "/scripts", icon: FileText, label: "Scripts" },
        ]),
    { to: "/scheduling", icon: CalendarDays, label: "Scheduling" },
    ...(!viewer?.isAgent && isPlatformAdmin ? [{ to: "/admin", icon: ShieldCheck, label: "Admin" }] : []),
    { to: "/settings", icon: SettingsIcon, label: "Settings" },
  ];

  return (
    <div className="flex min-h-screen bg-[image:var(--gradient-subtle)]">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card/60 p-4 md:flex md:flex-col">
        <Link to="/" className="mb-8 flex items-center gap-2 font-semibold">
          <AppIcon />
          CallRecover
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent [&.active]:bg-accent [&.active]:text-accent-foreground"
              activeProps={{ className: "active" }}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <div className="mb-2 truncate text-xs text-muted-foreground">{user.email}</div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-3 w-3" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card/95 backdrop-blur md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] text-muted-foreground [&.active]:text-primary"
            activeProps={{ className: "active" }}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
