import { createFileRoute } from "@tanstack/react-router";
import {
  getMobileBusinessId,
  jsonResponse,
  optionsResponse,
  requireMobileSupabase,
} from "@/lib/mobile-auth.server";
import { sendMobilePushForNotification } from "@/lib/mobile-push.server";

export const Route = createFileRoute("/api/mobile/test-push")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      POST: async ({ request }) => {
        try {
          const { supabase } = await requireMobileSupabase(request);
          const businessId = await getMobileBusinessId(supabase);
          if (!businessId) return jsonResponse({ error: "No business found" }, 404);

          const result = await sendMobilePushForNotification(supabase, {
            businessId,
            title: "CallRecover test alert",
            body: "Production push is connected for Easy Fill AI.",
            data: { kind: "test" },
          });

          return jsonResponse({ ok: true, result });
        } catch (error) {
          return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request" }, 400);
        }
      },
    },
  },
});
