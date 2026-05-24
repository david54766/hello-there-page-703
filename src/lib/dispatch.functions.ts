import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "emergency" | "office" | "sales";

async function pickMember(supabase: any, businessId: string, role: Role) {
  const { data } = await supabase
    .from("team_members")
    .select("id, name, phone, email, last_assigned_at")
    .eq("business_id", businessId)
    .eq("role", role)
    .eq("active", true)
    .order("last_assigned_at", { ascending: true, nullsFirst: true })
    .limit(1);
  return data?.[0] ?? null;
}

export const assignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ callId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: call } = await supabase
      .from("calls")
      .select("id, business_id, priority, qualification, caller_number")
      .eq("id", data.callId)
      .single();
    if (!call) throw new Error("Call not found");

    const qual = (call.qualification ?? {}) as Record<string, string>;
    let role: Role = "office";
    if (call.priority === "high") role = "emergency";
    else if (qual.insurance_claim === "yes" || /quote|estimate/i.test(qual.service_needed ?? "")) role = "sales";

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

    await supabase.from("notifications").insert({
      business_id: call.business_id,
      call_id: call.id,
      kind: call.priority === "high" ? "emergency" : "dashboard",
      title: call.priority === "high" ? `🚨 Emergency assigned to ${member.name}` : `New lead → ${member.name}`,
      body: `${call.caller_number} · role: ${role}`,
    } as any);

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
      role: z.enum(["emergency", "office", "sales"]),
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