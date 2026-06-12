import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, optionsResponse, requireMobileSupabase } from "@/lib/mobile-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSmsForCall } from "@/lib/sms-send.server";

const Body = z.object({
  callId: z.string().uuid(),
  body: z.string().min(1).max(1500),
});

export const Route = createFileRoute("/api/mobile/send-sms")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      POST: async ({ request }) => {
        try {
          const { supabase } = await requireMobileSupabase(request);
          const body = Body.parse(await request.json());

          const { error } = await supabase
            .from("calls")
            .select("id")
            .eq("id", body.callId)
            .single();
          if (error) throw new Error("Call not found");

          const result = await sendSmsForCall(supabaseAdmin, body);
          return jsonResponse({ ok: true, sid: result.sid });
        } catch (error) {
          return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request" }, 400);
        }
      },
    },
  },
});
