// Curated ElevenLabs voice options surfaced in onboarding + the AI agent tab.
// `id` is the ElevenLabs voice ID passed to Vapi via { provider: "11labs", voiceId }.

export type VoiceOption = {
  id: string;
  label: string;
  gender: "female" | "male";
  description: string;
};

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah", gender: "female", description: "Warm, professional" },
  { id: "pFZP5JQG7iQjIQuC4Bku", label: "Lily",  gender: "female", description: "Bright, friendly" },
  { id: "nPczCjzI2devNBz1zQrb", label: "Brian", gender: "male",   description: "Calm, confident" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam",  gender: "male",   description: "Direct, upbeat" },
];

export const DEFAULT_VOICE_ID = VOICE_OPTIONS[0].id;

export function getVoice(id: string | null | undefined): VoiceOption {
  return VOICE_OPTIONS.find((v) => v.id === id) ?? VOICE_OPTIONS[0];
}