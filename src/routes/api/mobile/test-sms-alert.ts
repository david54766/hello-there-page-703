import { createFileRoute } from "@tanstack/react-router";
import { getMobileBusinessId, jsonResponse, optionsResponse, requireMobileSupabase } from "@/lib/mobile-auth.server";
import { sendBusinessOwnerTestSms } from "@/lib/sms-send.server";

export const Route = createFileRoute("/api/mobile/test-sms-alert")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      POST: async ({ request }) => {
        try {
          const { supabase } = await requireMobileSupabase(request);
          const businessId = await getMobileBusinessId(supabase);
          if (!businessId) return jsonResponse({ error: "Business not found" }, 404);
          const result = await sendBusinessOwnerTestSms(supabase, businessId);
          return jsonResponse({ ok: true, result });
        } catch (error) {
          return jsonResponse({ error: error instanceof Error ? error.message : "SMS test failed" }, 400);
        }
      },
    },
  },
});
