import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getMobileBusinessId,
  jsonResponse,
  optionsResponse,
  requireMobileSupabase,
} from "@/lib/mobile-auth.server";

const Status = z.enum([
  "not_started",
  "instructions_viewed",
  "dialer_opened",
  "user_confirmed",
  "test_detected",
  "failed",
]);

const Body = z.object({
  status: Status,
  carrier: z.enum(["verizon", "att", "tmobile", "comcast", "ringcentral", "google_voice", "other"]).optional().nullable(),
  forwardingNumber: z.string().max(40).optional().nullable(),
  dialCode: z.string().max(80).optional().nullable(),
  lastTestId: z.string().uuid().optional().nullable(),
});

export const Route = createFileRoute("/api/mobile/forwarding-status")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      GET: async ({ request }) => {
        try {
          const { supabase } = await requireMobileSupabase(request);
          const businessId = await getMobileBusinessId(supabase);
          if (!businessId) return jsonResponse({ error: "No business found" }, 404);

          const { data, error } = await supabase
            .from("call_forwarding_status" as any)
            .select("*")
            .eq("business_id", businessId)
            .maybeSingle();

          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ status: data ?? { business_id: businessId, status: "not_started" } });
        } catch (error) {
          return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request" }, 400);
        }
      },
      POST: async ({ request }) => {
        try {
          const { supabase, userId } = await requireMobileSupabase(request);
          const businessId = await getMobileBusinessId(supabase);
          if (!businessId) return jsonResponse({ error: "No business found" }, 404);

          const body = Body.parse(await request.json());
          const { data, error } = await supabase
            .from("call_forwarding_status" as any)
            .upsert(
              {
                business_id: businessId,
                status: body.status,
                carrier: body.carrier ?? null,
                forwarding_number: body.forwardingNumber ?? null,
                dial_code: body.dialCode ?? null,
                last_test_id: body.lastTestId ?? null,
                updated_by: userId,
              },
              { onConflict: "business_id" },
            )
            .select("*")
            .single();

          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ ok: true, status: data });
        } catch (error) {
          return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request" }, 400);
        }
      },
    },
  },
});
