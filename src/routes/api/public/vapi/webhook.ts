import { createFileRoute } from "@tanstack/react-router";
import { handleVapiWebhookPayload } from "@/lib/vapi-webhook.server";

function authorized(request: Request) {
  const secret = process.env.VAPI_WEBHOOK_SECRET?.trim();
  if (!secret) return true;

  const authorization = request.headers.get("authorization") ?? "";
  const vapiSecret = request.headers.get("x-vapi-secret") ?? "";
  const callrecoverSecret = request.headers.get("x-callrecover-webhook-secret") ?? "";

  return (
    authorization === `Bearer ${secret}` ||
    vapiSecret === secret ||
    callrecoverSecret === secret
  );
}

export const Route = createFileRoute("/api/public/vapi/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const payload = await request.json();
          const result = await handleVapiWebhookPayload(payload);
          return Response.json(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid Vapi webhook";
          console.error("[Vapi webhook]", message);
          return Response.json({ ok: false, error: message }, { status: 400 });
        }
      },
    },
  },
});
