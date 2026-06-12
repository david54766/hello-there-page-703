import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, optionsResponse, requireMobileSupabase } from "@/lib/mobile-auth.server";
import { scanWebsiteForSetup } from "@/lib/setup-scan.server";

const Body = z.object({ url: z.string().min(3).max(500) });

export const Route = createFileRoute("/api/mobile/setup-scan")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      POST: async ({ request }) => {
        try {
          await requireMobileSupabase(request);
          const body = Body.parse(await request.json());
          const result = await scanWebsiteForSetup(body.url);
          return jsonResponse({ ok: true, result });
        } catch (error) {
          return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request" }, 400);
        }
      },
    },
  },
});
