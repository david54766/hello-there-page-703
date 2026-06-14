import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Manual staff SMS is intentionally disabled for compliance.
 * Automated transactional text messages still use sms-send.server.ts directly.
 */
export const sendSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      callId: z.string().uuid(),
      body: z.string().min(1).max(1500),
    }).parse(input),
  )
  .handler(async () => {
    throw new Error(
      "Manual staff SMS from the CallRecover system number is disabled. Use the caller's native SMS app so the assigned team member replies from their own number.",
    );
  });
