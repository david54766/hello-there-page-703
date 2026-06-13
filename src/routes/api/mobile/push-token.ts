import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getMobileBusinessId,
  jsonResponse,
  optionsResponse,
  requireMobileSupabase,
} from "@/lib/mobile-auth.server";

const RegisterBody = z.object({
  token: z.string().min(20).max(4096),
  platform: z.enum(["android", "ios"]),
  deviceId: z.string().max(200).optional(),
});

const DeleteBody = z.object({
  token: z.string().min(20).max(4096),
});

export const Route = createFileRoute("/api/mobile/push-token")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      POST: async ({ request }) => {
        try {
          const { supabase, userId } = await requireMobileSupabase(request);
          const body = RegisterBody.parse(await request.json());
          const businessId = await getMobileBusinessId(supabase);
          if (!businessId) return jsonResponse({ error: "No business found" }, 404);

          const { data, error } = await supabase
            .from("mobile_push_tokens" as any)
            .upsert(
              {
                business_id: businessId,
                user_id: userId,
                platform: body.platform,
                token: body.token,
                device_id: body.deviceId ?? null,
                disabled_at: null,
                last_seen_at: new Date().toISOString(),
              },
              { onConflict: "token" },
            )
            .select("id,last_seen_at")
            .single();

          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ ok: true, token: data });
        } catch (error) {
          return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request" }, 400);
        }
      },
      DELETE: async ({ request }) => {
        try {
          const { supabase, userId } = await requireMobileSupabase(request);
          const body = DeleteBody.parse(await request.json());
          const { error } = await supabase
            .from("mobile_push_tokens" as any)
            .update({ disabled_at: new Date().toISOString() })
            .eq("token", body.token)
            .eq("user_id", userId);

          if (error) return jsonResponse({ error: error.message }, 500);
          return jsonResponse({ ok: true });
        } catch (error) {
          return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request" }, 400);
        }
      },
    },
  },
});
