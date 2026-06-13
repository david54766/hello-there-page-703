import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, optionsResponse, requireMobileSupabase } from "@/lib/mobile-auth.server";
import { VOICE_OPTIONS } from "@/lib/voices";

const Body = z.object({
  voiceId: z.string().min(1).max(80),
  text: z.string().min(1).max(500),
});

const allowedVoiceIds = new Set(VOICE_OPTIONS.map((voice) => voice.id));

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export const Route = createFileRoute("/api/mobile/voice-preview")({
  server: {
    handlers: {
      OPTIONS: async () => optionsResponse(),
      POST: async ({ request }) => {
        try {
          await requireMobileSupabase(request);
          const body = Body.parse(await request.json());
          if (!allowedVoiceIds.has(body.voiceId)) {
            return jsonResponse({ error: "Voice is not available" }, 400);
          }

          const apiKey = process.env.ELEVENLABS_API_KEY;
          if (!apiKey) return jsonResponse({ error: "Voice preview is not configured" }, 500);

          const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(body.voiceId)}?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
                "xi-api-key": apiKey,
              },
              body: JSON.stringify({
                text: body.text,
                model_id: "eleven_flash_v2_5",
                voice_settings: {
                  stability: 0.45,
                  similarity_boost: 0.8,
                  style: 0.2,
                  use_speaker_boost: true,
                },
              }),
            },
          );

          if (!response.ok) {
            const detail = await response.text();
            return jsonResponse({ error: `Voice preview failed: ${detail.slice(0, 200)}` }, 502);
          }

          const audioBase64 = arrayBufferToBase64(await response.arrayBuffer());
          return jsonResponse({ audioBase64, mimeType: "audio/mpeg" });
        } catch (error) {
          return jsonResponse({ error: error instanceof Error ? error.message : "Voice preview failed" }, 400);
        }
      },
    },
  },
});
