import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { PhoneCall, MessageSquare, Check, TrendingUp, Inbox, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

type Call = {
  id: string;
  caller_number: string;
  caller_name: string | null;
  ai_summary: string | null;
  urgency: "low" | "medium" | "high" | "emergency";
  status: "new" | "contacted" | "resolved";
  callback_requested: boolean;
  created_at: string;
};

type Business = { id: string; business_name: string; avg_job_value: number; onboarding_complete: boolean };

const urgencyColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent text-accent-foreground",
  high: "bg-warning/20 text-warning-foreground",
  emergency: "bg-destructive/15 text-destructive",
};

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: biz } = await supabase
        .from("businesses")
        .select("id, business_name, avg_job_value, onboarding_complete")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!biz) { setLoading(false); return; }
      setBusiness(biz);
      if (!biz.onboarding_complete) { navigate({ to: "/onboarding" }); return; }
      const { data: c } = await supabase
        .from("calls")
        .select("id, caller_number, caller_name, ai_summary, urgency, status, callback_requested, created_at")
        .eq("business_id", biz.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setCalls((c ?? []) as Call[]);
      setLoading(false);

      const channel = supabase
        .channel(`calls:${biz.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `business_id=eq.${biz.id}` }, (p) => {
          if (p.eventType === "INSERT") setCalls((prev) => [p.new as Call, ...prev]);
          if (p.eventType === "UPDATE") setCalls((prev) => prev.map((x) => x.id === (p.new as Call).id ? (p.new as Call) : x));
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    })();
  }, [user, navigate]);

  async function markResolved(id: string) {
    const { error } = await supabase.from("calls").update({ status: "resolved" }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Marked resolved");
  }

  const recovered = calls.filter((c) => c.status !== "new").length;
  const openLeads = calls.filter((c) => c.status === "new").length;
  const revenue = recovered * (business?.avg_job_value ?? 500);
  const responseRate = calls.length ? Math.round((recovered / calls.length) * 100) : 0;

  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's what CallRescue caught for {business?.business_name}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: PhoneCall, label: "Recovered Calls", value: recovered },
          { icon: TrendingUp, label: "Revenue Saved", value: `$${revenue.toLocaleString()}` },
          { icon: Activity, label: "Response Rate", value: `${responseRate}%` },
          { icon: Inbox, label: "Open Leads", value: openLeads },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</span>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">{s.value}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Live activity</h2>
        {calls.length === 0 ? (
          <Card className="p-10 text-center">
            <PhoneCall className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-medium">No missed calls yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Once a customer leaves a voicemail, you'll see it here in real-time.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {calls.map((c) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-5 shadow-[var(--shadow-card)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.caller_name ?? "Unknown caller"}</span>
                        <span className="text-sm text-muted-foreground">{c.caller_number}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgencyColors[c.urgency]}`}>
                          {c.urgency}
                        </span>
                        {c.callback_requested && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Callback requested
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-foreground/80">{c.ai_summary ?? "Processing voicemail…"}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button asChild variant="default" size="sm">
                        <a href={`tel:${c.caller_number}`}><PhoneCall className="h-3.5 w-3.5" /> Call</a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={`sms:${c.caller_number}`}><MessageSquare className="h-3.5 w-3.5" /> Text</a>
                      </Button>
                      {c.status !== "resolved" && (
                        <Button variant="ghost" size="sm" onClick={() => markResolved(c.id)}>
                          <Check className="h-3.5 w-3.5" /> Resolve
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
    </div>
  );
}
