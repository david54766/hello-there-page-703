import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { PhoneCall, MessageSquare, Check, TrendingUp, Inbox, Activity, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { LeadDrawer } from "@/components/lead-drawer";
import { NotificationsBell } from "@/components/notifications-bell";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

type Call = {
  id: string;
  business_id: string;
  caller_number: string;
  caller_name: string | null;
  transcript: string | null;
  ai_summary: string | null;
  ai_summary_short: string | null;
  urgency: "low" | "medium" | "high" | "emergency";
  status: "new" | "contacted" | "resolved";
  lead_status: "open" | "contacted" | "scheduled" | "closed";
  priority: "normal" | "high";
  qualification: Record<string, string> | null;
  callback_requested: boolean;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
};

type Business = { id: string; business_name: string; avg_job_value: number; onboarding_complete: boolean };

const urgencyColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent text-accent-foreground",
  high: "bg-warning/20 text-warning-foreground",
  emergency: "bg-destructive/15 text-destructive",
};

const statusColors: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  contacted: "bg-accent text-accent-foreground",
  scheduled: "bg-warning/20 text-warning-foreground",
  closed: "bg-muted text-muted-foreground",
};

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border bg-muted/40 px-2 py-0.5 text-xs">{children}</span>;
}

function byNewest(a: Call, b: Call) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Call | null>(null);

  const loadDashboard = useCallback(async (showSpinner = false) => {
    if (!user) return;
    if (showSpinner) setLoading(true);
    const { data: biz, error: bizError } = await supabase
      .from("businesses")
      .select("id, business_name, avg_job_value, onboarding_complete")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (bizError) {
      console.warn("Dashboard business refresh failed", bizError);
      setLoading(false);
      return;
    }
    if (!biz) {
      setBusiness(null);
      setCalls([]);
      setLoading(false);
      return;
    }

    setBusiness(biz);
    if (!biz.onboarding_complete) {
      navigate({ to: "/onboarding" });
      return;
    }

    const { data: c, error: callsError } = await supabase
      .from("calls")
      .select("id, business_id, caller_number, caller_name, transcript, ai_summary, ai_summary_short, urgency, status, lead_status, priority, qualification, callback_requested, archived_at, archived_by, created_at")
      .eq("business_id", biz.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (callsError) {
      console.warn("Dashboard calls refresh failed", callsError);
      setLoading(false);
      return;
    }
    setCalls(((c ?? []) as Call[]).sort(byNewest));
    setLoading(false);
  }, [user, navigate]);

  const upsertCall = useCallback((row: Call) => {
    setCalls((prev) => {
      const index = prev.findIndex((x) => x.id === row.id);
      if (index === -1) return [row, ...prev].sort(byNewest);
      const next = [...prev];
      next[index] = row;
      return next.sort(byNewest);
    });
    setSelected((current) => (current?.id === row.id ? row : current));
  }, []);

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  useEffect(() => {
    if (!business?.id) return;
    const businessId = business.id;
    const refresh = () => void loadDashboard(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const channel = supabase
      .channel(`calls:${businessId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `business_id=eq.${businessId}` }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as Partial<Call> | null)?.id;
          if (!id) {
            refresh();
            return;
          }
          setCalls((prev) => prev.filter((x) => x.id !== id));
          setSelected((current) => (current?.id === id ? null : current));
          return;
        }

        const row = payload.new as Call | null;
        if (!row?.id) {
          refresh();
          return;
        }
        upsertCall(row);
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          window.setTimeout(refresh, 750);
        }
      });

    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
      void supabase.removeChannel(channel);
    };
  }, [business?.id, loadDashboard, upsertCall]);

  async function markResolved(id: string) {
    const { error } = await supabase
      .from("calls")
      .update({
        status: "resolved",
        lead_status: "closed",
        archived_at: new Date().toISOString(),
        archived_by: user?.id ?? null,
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Resolved and archived");
  }

  async function restoreArchived(id: string) {
    const { error } = await supabase.from("calls").update({ archived_at: null, archived_by: null }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Lead restored");
  }

  const activeCalls = calls.filter((c) => !c.archived_at);
  const archivedCalls = calls.filter((c) => !!c.archived_at);
  const recovered = calls.filter((c) => c.lead_status !== "open").length;
  const openLeads = activeCalls.filter((c) => c.lead_status === "open").length;
  const revenue = recovered * (business?.avg_job_value ?? 500);
  const responseRate = calls.length ? Math.round((recovered / calls.length) * 100) : 0;

  const sorted = [...activeCalls].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const archivedSorted = [...archivedCalls].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 sm:py-10 md:pb-10">
      <div className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's what CallRecover caught for {business?.business_name}.</p>
        </div>
        <NotificationsBell businessId={business?.id ?? null} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { icon: PhoneCall, label: "Recovered Calls", value: recovered },
          { icon: TrendingUp, label: "Revenue Saved", value: `$${revenue.toLocaleString()}` },
          { icon: Activity, label: "Response Rate", value: `${responseRate}%` },
          { icon: Inbox, label: "Open Leads", value: openLeads },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 shadow-[var(--shadow-card)] sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">{s.label}</span>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
                <div className="mt-2 text-xl font-semibold tabular-nums tracking-tight sm:mt-3 sm:text-3xl">{s.value}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Live activity</h2>
        {activeCalls.length === 0 ? (
          <Card className="p-10 text-center">
            <PhoneCall className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-medium">No missed calls yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Once a customer leaves a voicemail, you'll see it here in real-time.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {sorted.map((c) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  onClick={() => setSelected(c)}
                  className={`cursor-pointer p-5 shadow-[var(--shadow-card)] transition hover:border-primary/50 ${c.priority === "high" ? "border-destructive/60 bg-destructive/5" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {c.priority === "high" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
                            <AlertTriangle className="h-3 w-3" /> HIGH
                          </span>
                        )}
                        <span className="font-medium">{c.caller_name ?? "Unknown caller"}</span>
                        <span className="text-sm text-muted-foreground">{c.caller_number}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgencyColors[c.urgency]}`}>{c.urgency}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[c.lead_status]}`}>{c.lead_status}</span>
                        {c.callback_requested && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Callback requested</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-foreground/80">{c.ai_summary_short ?? c.ai_summary ?? "Processing voicemail…"}</p>
                      {c.qualification && Object.keys(c.qualification).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {c.qualification.service_needed && <Chip>{c.qualification.service_needed}</Chip>}
                          {c.qualification.callback_time && <Chip>⏰ {c.qualification.callback_time}</Chip>}
                          {c.qualification.address && <Chip>📍 {c.qualification.address}</Chip>}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button asChild variant="default" size="sm">
                        <a href={`tel:${c.caller_number}`}><PhoneCall className="h-3.5 w-3.5" /> Call</a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={`sms:${c.caller_number}`}><MessageSquare className="h-3.5 w-3.5" /> Text</a>
                      </Button>
                      {c.lead_status !== "closed" && (
                        <Button variant="ghost" size="sm" onClick={() => markResolved(c.id)}>
                          <Check className="h-3.5 w-3.5" /> Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {archivedSorted.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Archived calls</h2>
          <div className="grid gap-3">
            {archivedSorted.map((c) => (
              <Card key={c.id} onClick={() => setSelected(c)} className="cursor-pointer p-5 shadow-[var(--shadow-card)] transition hover:border-primary/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.caller_name ?? "Unknown caller"}</span>
                      <span className="text-sm text-muted-foreground">{c.caller_number}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">archived</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[c.lead_status]}`}>{c.lead_status}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/80">{c.ai_summary_short ?? c.ai_summary ?? "Archived lead."}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); restoreArchived(c.id); }}>
                    Restore
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <LeadDrawer call={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
