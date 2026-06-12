import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getFirstServerEnv } from "@/lib/env.server";
import { sendPasswordResetEmail } from "@/lib/password-reset.server";

const Body = z.object({ email: z.string().email() });

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export const Route = createFileRoute("/api/public/password-reset")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      POST: async ({ request }) => {
        let result: Awaited<ReturnType<typeof sendPasswordResetEmail>> | null = null;
        try {
          const body = Body.parse(await request.json());
          result = await sendPasswordResetEmail(body.email);
        } catch (error) {
          console.warn("Password reset request failed:", error instanceof Error ? error.message : error);
        }

        const debugSecret = getFirstServerEnv(["CALLRECOVER_ADMIN_TEST_SECRET", "VAPI_WEBHOOK_SECRET"]);
        const wantsDebug = Boolean(debugSecret && request.headers.get("x-callrecover-debug") === debugSecret);
        return new Response(JSON.stringify({ ok: true, ...(wantsDebug ? { debug: result } : {}) }), {
          status: 200,
          headers,
        });
      },
    },
  },
});
