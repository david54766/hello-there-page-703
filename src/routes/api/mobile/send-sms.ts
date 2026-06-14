import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, optionsResponse } from "@/lib/mobile-auth.server";

export const Route = createFileRoute("/api/mobile/send-sms")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      POST: async () =>
        jsonResponse(
          {
            error:
              "Manual staff SMS from the CallRecover system number is disabled. Open the caller in the device SMS app so the assigned team member replies from their own number.",
          },
          410,
        ),
    },
  },
});
