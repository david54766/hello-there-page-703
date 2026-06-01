import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getBusinessId(supabase: any): Promise<string | null> {
  const { data } = await supabase.from("business_members").select("business_id").limit(1);
  return data?.[0]?.business_id ?? null;
}

export const getSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await getBusinessId(context.supabase);
    if (!businessId) return { appointments: [], blackouts: [], teamMembers: [], schedulingEnabled: false, business: null };
    const [biz, appts, blackouts, team] = await Promise.all([
      context.supabase.from("businesses").select("*").eq("id", businessId).single(),
      context.supabase
        .from("appointments")
        .select("*")
        .eq("business_id", businessId)
        .gte("scheduled_for", data.from)
        .lte("scheduled_for", data.to)
        .order("scheduled_for", { ascending: true }),
      context.supabase
        .from("schedule_blackouts")
        .select("*")
        .eq("business_id", businessId)
        .gte("end_at", data.from)
        .lte("start_at", data.to),
      context.supabase
        .from("team_members")
        .select("id,name,color,availability,active")
        .eq("business_id", businessId)
        .eq("active", true),
    ]);
    return {
      business: biz.data,
      schedulingEnabled: biz.data?.scheduling_enabled ?? false,
      appointments: appts.data ?? [],
      blackouts: blackouts.data ?? [],
      teamMembers: team.data ?? [],
    };
  });

export const bookAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      teamMemberId: z.string().uuid(),
      scheduledFor: z.string().datetime(),
      durationMinutes: z.number().int().min(15).max(480).default(60),
      customerName: z.string().max(200).optional(),
      customerPhone: z.string().max(40).optional(),
      service: z.string().max(200).optional(),
      notes: z.string().max(2000).optional(),
      callId: z.string().uuid().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await getBusinessId(context.supabase);
    if (!businessId) throw new Error("No business found");
    const start = new Date(data.scheduledFor);
    const end = new Date(start.getTime() + data.durationMinutes * 60_000);

    // Conflict check: same team member, overlapping window
    const { data: conflicts } = await context.supabase
      .from("appointments")
      .select("id,scheduled_for,duration_minutes")
      .eq("business_id", businessId)
      .eq("team_member_id", data.teamMemberId)
      .neq("status", "cancelled");
    const overlap = (conflicts ?? []).find((c: any) => {
      const cs = new Date(c.scheduled_for).getTime();
      const ce = cs + (c.duration_minutes ?? 60) * 60_000;
      return cs < end.getTime() && ce > start.getTime();
    });
    if (overlap) throw new Error("Agent already has an appointment overlapping that slot");

    // Blackout check
    const { data: blacks } = await context.supabase
      .from("schedule_blackouts")
      .select("*")
      .eq("business_id", businessId)
      .or(`team_member_id.eq.${data.teamMemberId},team_member_id.is.null`);
    const blocked = (blacks ?? []).find((b: any) => {
      const bs = new Date(b.start_at).getTime();
      const be = new Date(b.end_at).getTime();
      return bs < end.getTime() && be > start.getTime();
    });
    if (blocked) throw new Error("That slot is blacked out");

    const { data: appt, error } = await context.supabase
      .from("appointments")
      .insert({
        business_id: businessId,
        team_member_id: data.teamMemberId,
        call_id: data.callId ?? null,
        scheduled_for: data.scheduledFor,
        duration_minutes: data.durationMinutes,
        customer_name: data.customerName ?? null,
        customer_phone: data.customerPhone ?? null,
        service: data.service ?? null,
        notes: data.notes ?? null,
        source: data.callId ? "vapi_call" : "manual",
        status: "booked",
        provider: "internal",
      } as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { appointment: appt };
  });

export const cancelAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertBlackout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid().optional(),
      teamMemberId: z.string().uuid().nullable().optional(),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      reason: z.string().max(200).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await getBusinessId(context.supabase);
    if (!businessId) throw new Error("No business found");
    const row = {
      id: data.id,
      business_id: businessId,
      team_member_id: data.teamMemberId ?? null,
      start_at: data.startAt,
      end_at: data.endAt,
      reason: data.reason ?? null,
    };
    const { data: saved, error } = await context.supabase
      .from("schedule_blackouts")
      .upsert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { blackout: saved };
  });

export const deleteBlackout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("schedule_blackouts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setSchedulingEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const businessId = await getBusinessId(context.supabase);
    if (!businessId) throw new Error("No business found");
    const { error } = await context.supabase
      .from("businesses")
      .update({ scheduling_enabled: data.enabled })
      .eq("id", businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateBusinessTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      website: z.string().max(500).optional(),
      website_blurb: z.string().max(1000).optional(),
      booking_url: z.string().max(500).optional(),
      callback_form_url: z.string().max(500).optional(),
      sms_consent_text: z.string().max(500).optional(),
      default_hello_script: z.string().max(1000).optional(),
      cal_url: z.string().max(500).optional(),
      calendly_url: z.string().max(500).optional(),
      address: z.string().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await getBusinessId(context.supabase);
    if (!businessId) throw new Error("No business found");
    const { error } = await context.supabase.from("businesses").update(data).eq("id", businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getBusinessForTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const businessId = await getBusinessId(context.supabase);
    if (!businessId) return { business: null };
    const { data } = await context.supabase.from("businesses").select("*").eq("id", businessId).single();
    return { business: data };
  });