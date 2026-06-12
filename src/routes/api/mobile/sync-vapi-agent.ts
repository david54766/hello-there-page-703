import { createFileRoute } from "@tanstack/react-router";
import { getMobileBusinessId, jsonResponse, optionsResponse, requireMobileSupabase } from "@/lib/mobile-auth.server";
import { syncVapiAssistantsForBusiness } from "@/lib/vapi.functions";

export const Route = createFileRoute("/api/mobile/sync-vapi-agent")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      POST: async ({ request }) => {
        try {
          const { supabase } = await requireMobileSupabase(request);
          const businessId = await getMobileBusinessId(supabase);
          if (!businessId) return jsonResponse({ error: "Business not found" }, 404);

          const result = await syncVapiAssistantsForBusiness(supabase, businessId, {
            linkPhoneNumbers: true,
          });
          return jsonResponse({ ok: true, result });
        } catch (error) {
          return jsonResponse(
            { error: error instanceof Error ? error.message : "Could not sync Vapi agent" },
            400,
          );
        }
      },
    },
  },
});
