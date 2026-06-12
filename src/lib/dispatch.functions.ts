import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendMobilePushForNotification } from "./mobile-push.server";

type Role = "all" | "emergency" | "office" | "sales" | "service";

async function pickMember(supabase: any, businessId: string, role: Role) {
  const roles = role === "all" ? ["all"] : [role, "all"];
  const { data } = await supabase
    .from("team_members")
    .select("id, name, phone, email, role, last_assigned_at")
    .eq("business_id", businessId)
    .in("role", roles)
    .eq("active", true)
    .order("last_assigned_at", { ascending: true, nullsFirst: true })
    .limit(10);
  if (role !== "all") {
    const exact = data?.find((member: any) => member.role === role);
    if (exact) return exact;
  }
  return data?.[0] ?? null;
}

export const assignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ callId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: call } = await supabase
      .from("calls")
      .select("id, business_id, priority, urgency, qualification, caller_number, service_needed")
      .eq("id", data.callId)
      .single();
    if (!call) throw new Error("Call not found");

    const qual = (call.qualification ?? {}) as Record<string, string>;
    const serviceText = [qual.service_needed, (call as any).service_needed]
      .filter(Boolean)
      .join(" ");
    let role: Role = "office";
    if (call.priority === "high" || call.urgency === "emergency") role = "emergency";
    else if (qual.insurance_claim === "yes" || /quote|estimate|bid|pricing|price/i.test(serviceText)) role = "sales";
    else if (/repair|leak|service|maintenance|install|replacement|damage|fix/i.test(serviceText)) role = "service";

    let member = await pickMember(supabase, call.business_id, role);
    if (!member && role !== "office") member = await pickMember(supabase, call.business_id, "office");
    if (!member) {
      // fallback: no team members yet — skip
      return { assigned: false, reason: "No active team members" };
    }

    await supabase.from("team_members").update({ last_assigned_at: new Date().toISOString() }).eq("id", member.id);

    const { data: assignment, error } = await supabase
      .from("lead_assignments")
      .insert({
        business_id: call.business_id,
        call_id: call.id,
        team_member_id: member.id,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const notification = {
      business_id: call.business_id,
      call_id: call.id,
      kind: call.priority === "high" ? "emergency" : "dashboard",
      title: call.priority === "high" ? `🚨 Emergency assigned to ${member.name}` : `New lead → ${member.name}`,
      body: `${call.caller_number} · role: ${role}`,
    };

    await supabase.from("notifications").insert(notification as any);
    await sendMobilePushForNotification(supabase, {
      businessId: call.business_id,
      callId: call.id,
      title: notification.title,
      body: notification.body,
      data: { kind: notification.kind, assignmentId: assignment.id },
    });

    return { assigned: true, assignment, member, role };
  });

export const acknowledgeAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lead_assignments")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid().optional(),
      businessId: z.string().uuid(),
      name: z.string().min(1).max(120),
      phone: z.string().max(40).optional().nullable(),
      email: z.string().email().max(200).optional().nullable(),
      role: z.enum(["all", "emergency", "office", "sales", "service"]),
      active: z.boolean(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const payload = {
      business_id: data.businessId,
      name: data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      role: data.role,
      active: data.active,
    };
    if (data.id) {
      const { error } = await supabase.from("team_members").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("team_members").insert(payload as any);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("team_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
