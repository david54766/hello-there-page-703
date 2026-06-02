import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, optionsResponse, requireMobileSupabase } from "@/lib/mobile-auth.server";

const Body = z.object({
  callId: z.string().uuid(),
});

export const Route = createFileRoute("/api/mobile/recording-url")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      POST: async ({ request }) => {
        try {
          const { supabase } = await requireMobileSupabase(request);
          const body = Body.parse(await request.json());
          const { data, error } = await supabase
            .from("calls")
            .select("id,recording_url")
            .eq("id", body.callId)
            .single();

          if (error || !data) return jsonResponse({ error: error?.message ?? "Call not found" }, 404);
          if (!data.recording_url) return jsonResponse({ error: "No recording available" }, 404);

          return jsonResponse({ url: data.recording_url });
        } catch (error) {
          return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request" }, 400);
        }
      },
    },
  },
});
