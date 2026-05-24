import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Provider-agnostic scheduling. For now, all bookings land in the local
 * `appointments` table. When HCP/Jobber API keys are present on the business,
 * we also push to the provider (stubbed — wire up once keys are configured).
 */
export const createAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      businessId: z.string().uuid(),
      callId: z.string().uuid().optional(),
      scheduledFor: z.string().datetime(),
      customerName: z.string().max(200).optional(),
      customerPhone: z.string().max(40).optional(),
      service: z.string().max(200).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: biz } = await supabase
      .from("businesses")
      .select("scheduling_provider, hcp_api_key, jobber_refresh_token")
      .eq("id", data.businessId)
      .single();
    const provider = (biz?.scheduling_provider ?? "internal") as "hcp" | "jobber" | "internal";

    let providerRef: string | null = null;
    if (provider === "hcp" && biz?.hcp_api_key) {
      // TODO: POST to https://api.housecallpro.com/jobs
      providerRef = `hcp_stub_${Date.now()}`;
    } else if (provider === "jobber" && biz?.jobber_refresh_token) {
      // TODO: Jobber GraphQL createRequest mutation
      providerRef = `jobber_stub_${Date.now()}`;
    }

    const { data: appt, error } = await supabase
      .from("appointments")
      .insert({
        business_id: data.businessId,
        call_id: data.callId ?? null,
        provider,
        provider_ref: providerRef,
        scheduled_for: data.scheduledFor,
        customer_name: data.customerName ?? null,
        customer_phone: data.customerPhone ?? null,
        service: data.service ?? null,
        status: "booked",
      } as any)
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.callId) {
      await supabase.from("calls").update({ lead_status: "scheduled" }).eq("id", data.callId);
    }
    return { appointment: appt };
  });

export const listAppointments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("appointments")
      .select("*")
      .eq("business_id", data.businessId)
      .order("scheduled_for", { ascending: true });
    return { appointments: rows ?? [] };
  });