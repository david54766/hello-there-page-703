import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
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
        try {
          const body = Body.parse(await request.json());
          await sendPasswordResetEmail(body.email);
        } catch (error) {
          console.warn("Password reset request failed:", error instanceof Error ? error.message : error);
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
      },
    },
  },
});
