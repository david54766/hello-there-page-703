// Shared tag/merge variable utilities used by Vapi prompts + first messages.
// Server-side substitution lives in vapi.functions.ts; client uses TAG_DEFS
// to render the "Insert tag" dropdown.

export type TagKey =
  | "name"
  | "business"
  | "address"
  | "website"
  | "website_info"
  | "book_consult"
  | "callback_form"
  | "sms_consent"
  | "hello_script";

export const TAG_DEFS: { key: TagKey; label: string; hint: string }[] = [
  { key: "name", label: "{name}", hint: "Customer name (per-call)" },
  { key: "business", label: "{business}", hint: "Your business name" },
  { key: "address", label: "{address}", hint: "Your service address" },
  { key: "website", label: "{website}", hint: "Your website URL" },
  { key: "website_info", label: "{website_info}", hint: "Short blurb shared if asked about your site" },
  { key: "book_consult", label: "{book_consult}", hint: "Booking / consultation link" },
  { key: "callback_form", label: "{callback_form}", hint: "Callback request form URL" },
  { key: "sms_consent", label: "{sms_consent}", hint: "SMS opt-in confirmation language" },
  { key: "hello_script", label: "{hello_script}", hint: "Default greeting" },
];

export type TagValues = Partial<Record<TagKey, string>>;

export function applyTags(text: string | null | undefined, values: TagValues): string {
  if (!text) return "";
  return text.replace(/\{(\w+)\}/g, (m, k) => {
    const v = (values as Record<string, string | undefined>)[k];
    return typeof v === "string" && v.length > 0 ? v : m;
  });
}

export function mergeTagDefaults(
  biz: Record<string, unknown> | null | undefined,
  overrides: TagValues = {},
): TagValues {
  const b = biz ?? {};
  const get = (k: string) => (typeof (b as any)[k] === "string" ? ((b as any)[k] as string) : undefined);
  const defaults: TagValues = {
    business: get("business_name"),
    address: get("address"),
    website: get("website"),
    website_info: get("website_blurb") ?? get("website"),
    book_consult: get("booking_url") ?? get("cal_url") ?? get("calendly_url"),
    callback_form: get("callback_form_url"),
    sms_consent: get("sms_consent_text"),
    hello_script: get("default_hello_script"),
  };
  return { ...defaults, ...Object.fromEntries(Object.entries(overrides).filter(([, v]) => v && v.length > 0)) };
}