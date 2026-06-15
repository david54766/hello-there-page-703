import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { syncExternalAppointment } from "@/lib/external-scheduling.server";

/**
 * Provider-agnostic scheduling. All bookings land in the local
 * `appointments` table first, then CallRecover tries to sync to the selected
 * external provider.
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
      .select("business_name,business_phone,scheduling_provider,hcp_api_key,jobber_refresh_token")
      .eq("id", data.businessId)
      .single();
    const provider = (biz?.scheduling_provider ?? "internal") as "hcp" | "jobber" | "internal";

    const { data: appt, error } = await supabase
      .from("appointments")
      .insert({
        business_id: data.businessId,
        call_id: data.callId ?? null,
        provider,
        scheduled_for: data.scheduledFor,
        customer_name: data.customerName ?? null,
        customer_phone: data.customerPhone ?? null,
        service: data.service ?? null,
        status: "booked",
      } as any)
      .select()
      .single();
    if (error) throw new Error(error.message);

    const providerSync = await syncExternalAppointment({
      supabase,
      businessId: data.businessId,
      business: biz as any,
      appointment: appt as any,
    });
    if (providerSync.ok && providerSync.providerRef) {
      await supabase
        .from("appointments")
        .update({
          provider: providerSync.provider,
          provider_ref: providerSync.providerRef,
          external_provider: providerSync.provider,
          external_event_id: providerSync.providerRef,
        } as any)
        .eq("id", (appt as any).id);
      (appt as any).provider = providerSync.provider;
      (appt as any).provider_ref = providerSync.providerRef;
      (appt as any).external_provider = providerSync.provider;
      (appt as any).external_event_id = providerSync.providerRef;
    }

    if (data.callId) {
      await supabase.from("calls").update({ lead_status: "scheduled" }).eq("id", data.callId);
    }
    return { appointment: appt, providerSync };
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
