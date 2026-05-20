export const EMERGENCY_KEYWORDS = [
  "leak", "flood", "flooding", "burst pipe", "burst", "no ac", "no a/c", "no air",
  "no heat", "no hot water", "burning smell", "smoke", "sparks", "electrical fire",
  "gas leak", "gas smell", "sewage", "backed up", "overflow", "ceiling collapse",
  "water damage", "shock", "exposed wire", "asap", "emergency", "urgent", "today",
];

export function scanForEmergency(text: string | null | undefined): { isEmergency: boolean; matches: string[] } {
  if (!text) return { isEmergency: false, matches: [] };
  const lower = text.toLowerCase();
  const matches = EMERGENCY_KEYWORDS.filter((k) => lower.includes(k));
  return { isEmergency: matches.length > 0, matches };
}