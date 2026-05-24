import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getRevenueStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();

    const [{ data: biz }, { data: calls }] = await Promise.all([
      supabase.from("businesses").select("avg_job_value").eq("id", data.businessId).single(),
      supabase
        .from("calls")
        .select("id, created_at, lead_status, priority")
        .eq("business_id", data.businessId)
        .gte("created_at", since),
    ]);

    const all = calls ?? [];
    const recovered = all.filter((c: any) => c.lead_status !== "open").length;
    const scheduled = all.filter((c: any) => c.lead_status === "scheduled" || c.lead_status === "closed").length;
    const total = all.length;
    const avgValue = biz?.avg_job_value ?? 500;
    const estValue = recovered * avgValue;
    const conv = total ? Math.round((scheduled / total) * 100) : 0;

    // Daily sparkline
    const days: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      const count = all.filter(
        (c: any) => c.created_at.slice(0, 10) === key && c.lead_status !== "open",
      ).length;
      days.push({ date: key, count });
    }

    // Response time (first outbound SMS vs call time)
    const { data: threads } = await supabase
      .from("sms_threads")
      .select("id, caller_number, created_at")
      .eq("business_id", data.businessId);

    let totalResponseSec = 0;
    let respondedCount = 0;
    if (threads && threads.length) {
      const ids = threads.map((t: any) => t.id);
      const { data: firstOut } = await supabase
        .from("sms_messages")
        .select("thread_id, created_at, direction")
        .in("thread_id", ids)
        .eq("direction", "outbound")
        .order("created_at", { ascending: true });
      const seen = new Set<string>();
      for (const m of firstOut ?? []) {
        if (seen.has(m.thread_id)) continue;
        seen.add(m.thread_id);
        const t = threads.find((x: any) => x.id === m.thread_id);
        if (!t) continue;
        totalResponseSec += (new Date(m.created_at).getTime() - new Date(t.created_at).getTime()) / 1000;
        respondedCount++;
      }
    }
    const avgResponseSec = respondedCount ? Math.round(totalResponseSec / respondedCount) : 0;

    return { recovered, total, scheduled, estValue, conv, avgResponseSec, sparkline: days };
  });

export const getLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows } = await supabase
      .from("lead_assignments")
      .select("team_member_id, status, team_members(name, role)")
      .eq("business_id", data.businessId);
    const map = new Map<string, { name: string; role: string; total: number; closed: number }>();
    for (const r of rows ?? []) {
      const tm: any = (r as any).team_members;
      if (!tm) continue;
      const key = (r as any).team_member_id;
      const cur = map.get(key) ?? { name: tm.name, role: tm.role, total: 0, closed: 0 };
      cur.total++;
      if ((r as any).status === "completed" || (r as any).status === "accepted") cur.closed++;
      map.set(key, cur);
    }
    return { rows: Array.from(map.values()).sort((a, b) => b.closed - a.closed) };
  });