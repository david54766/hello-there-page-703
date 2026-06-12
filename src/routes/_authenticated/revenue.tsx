import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { getRevenueStats, getLeaderboard } from "@/lib/metrics.functions";
import { TrendingUp, DollarSign, Target, Clock, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/revenue")({ component: Revenue });

function fmtSec(s: number) {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
}

function Revenue() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [leaders, setLeaders] = useState<any[]>([]);
  const statsFn = useServerFn(getRevenueStats);
  const leadersFn = useServerFn(getLeaderboard);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
      if (!biz) return;
      const [s, l] = await Promise.all([
        statsFn({ data: { businessId: biz.id } }),
        leadersFn({ data: { businessId: biz.id } }),
      ]);
      setStats(s);
      setLeaders(l.rows);
    })();
  }, [user, statsFn, leadersFn]);

  if (!stats) return <div className="p-10 text-muted-foreground">Loading metrics…</div>;

  const cards = [
    { icon: TrendingUp, label: "Recovered (30d)", value: stats.recovered, hint: `${stats.total} total leads` },
    { icon: DollarSign, label: "Est. revenue saved", value: `$${stats.estValue.toLocaleString()}` },
    { icon: Target, label: "Conversion rate", value: `${stats.conv}%` },
    { icon: Clock, label: "Avg response time", value: fmtSec(stats.avgResponseSec) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">Revenue</h1>
      <p className="mb-6 text-sm text-muted-foreground">Real money you're getting back from missed calls.</p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">{c.label}</span>
                <c.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{c.value}</div>
              {c.hint && <div className="mt-1 text-xs text-muted-foreground">{c.hint}</div>}
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="mt-6 p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recovered leads · last 14 days</h2>
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <AreaChart data={stats.sparkline}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} stroke="oklch(0.6 0.02 250)" />
              <YAxis allowDecimals={false} fontSize={11} stroke="oklch(0.6 0.02 250)" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="count" stroke="var(--primary)" fill="url(#g)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mt-6 p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Trophy className="h-4 w-4" /> Team leaderboard
        </h2>
        {leaders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments yet. Add team members in Settings → Team.</p>
        ) : (
          <div className="space-y-2">
            {leaders.map((l, i) => (
              <div key={l.name} className="flex items-center justify-between rounded-lg border bg-card/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{l.role}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{l.closed}/{l.total}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">closed/total</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
