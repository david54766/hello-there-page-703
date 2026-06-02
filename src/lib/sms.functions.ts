import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendSmsForCall } from "./sms-send.server";

/**
 * Send an SMS via Twilio REST API and persist it to sms_threads / sms_messages.
 * Appends a one-time STOP/HELP disclosure on the first outbound message in a thread.
 */
export const sendSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      callId: z.string().uuid(),
      body: z.string().min(1).max(1500),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const result = await sendSmsForCall(context.supabase, data);
    return { ok: true, sid: result.sid };
  });
