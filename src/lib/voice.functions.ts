import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Mints an ElevenLabs conversation token for the in-browser voice agent test mode.
 * The agent itself must be created in the ElevenLabs dashboard; paste its agent_id
 * into business settings. Once a Twilio voice number is approved we'll proxy the
 * inbound call through ElevenLabs WebRTC using the same token endpoint.
 */
export const mintAgentToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ agentId: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ELEVENLABS_API_KEY not configured");
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(data.agentId)}`,
      { headers: { "xi-api-key": key } },
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`ElevenLabs token error ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    return { token: json.token as string };
  });

export const buildAgentPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: biz } = await context.supabase
      .from("businesses")
      .select("business_name, contractor_type, business_hours, agent_prompt_override")
      .eq("id", data.businessId)
      .single();
    if (!biz) throw new Error("Business not found");
    if (biz.agent_prompt_override) return { prompt: biz.agent_prompt_override };

    const hours = (biz.business_hours ?? {}) as any;
    const trade = biz.contractor_type ?? "home services";
    return {
      prompt: `You are the friendly front desk receptionist for ${biz.business_name}, a ${trade} contractor.

Your job:
1. Greet the caller warmly and naturally — like a real receptionist, not a robot.
2. Find out what they need: service type, urgency, address, callback time.
3. If they describe an EMERGENCY (water leak, flooding, no heat, no AC, gas smell, electrical sparks, burst pipe), call escalate_emergency immediately and reassure them help is on the way.
4. Offer to schedule an appointment via book_appointment when appropriate.
5. Keep responses short — 1-2 sentences. Sound human.

Business hours: ${hours.weekday_start ?? "08:00"}–${hours.weekday_end ?? "18:00"} (${hours.timezone ?? "America/New_York"}).
If outside hours, take the message and promise a callback first thing in the morning.`,
    };
  });