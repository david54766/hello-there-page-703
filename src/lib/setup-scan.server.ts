import { aiJSON } from "@/lib/ai.server";

type SetupScanResult = {
  businessName?: string | null;
  contractorType?: string | null;
  businessPhone?: string | null;
  address?: string | null;
  website?: string | null;
  websiteBlurb?: string | null;
  bookingUrl?: string | null;
  callbackFormUrl?: string | null;
  defaultGreeting?: string | null;
};

const CONTRACTOR_TYPES = [
  "roofing",
  "plumbing",
  "hvac",
  "electrical",
  "information_technology",
  "landscaping",
  "pest_control",
  "restoration",
  "general_contractor",
  "painting",
  "concrete",
  "pool_services",
  "pressure_washing",
  "tree_services",
  "flooring",
  "handyman",
  "solar",
  "fencing",
];

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Website URL is required");
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use an http or https website URL");
  return url;
}

function cleanText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

function metaContent(html: string, name: string) {
  const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return html.match(pattern)?.[1]?.trim() ?? "";
}

function titleText(html: string) {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
}

function findPhone(text: string) {
  return text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0] ?? null;
}

function findLikelyLink(base: URL, html: string, words: string[]) {
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      try {
        return {
          href: new URL(match[1], base).toString(),
          label: cleanText(match[2]).toLowerCase(),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ href: string; label: string }>;
  return links.find((link) => words.some((word) => link.href.toLowerCase().includes(word) || link.label.includes(word)))?.href ?? null;
}

function heuristicType(text: string) {
  const lower = text.toLowerCase();
  const hits: Array<[string, string[]]> = [
    ["roofing", ["roof", "shingle", "gutter"]],
    ["plumbing", ["plumb", "drain", "water heater"]],
    ["hvac", ["hvac", "air conditioning", "heating", "furnace"]],
    ["electrical", ["electric", "panel", "breaker"]],
    ["landscaping", ["landscap", "lawn", "irrigation"]],
    ["pest_control", ["pest", "termite", "rodent"]],
    ["painting", ["paint", "interior", "exterior"]],
    ["concrete", ["concrete", "driveway", "slab"]],
  ];
  return hits.find(([, terms]) => terms.some((term) => lower.includes(term)))?.[0] ?? null;
}

export async function scanWebsiteForSetup(inputUrl: string): Promise<SetupScanResult> {
  const url = normalizeUrl(inputUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const res = await fetch(url, {
    signal: controller.signal,
    headers: { "User-Agent": "CallRecover setup scanner/1.0" },
  }).finally(() => clearTimeout(timeout));
  if (!res.ok) throw new Error(`Could not read website (${res.status})`);
  const html = await res.text();
  const text = cleanText(html);
  const title = titleText(html);
  const description = metaContent(html, "description") || metaContent(html, "og:description");
  const phone = findPhone(text);
  const fallback: SetupScanResult = {
    businessName: title ? title.split(/[|-]/)[0].trim() : null,
    contractorType: heuristicType(`${title} ${description} ${text}`),
    businessPhone: phone,
    website: url.toString(),
    websiteBlurb: description || text.slice(0, 240),
    bookingUrl: findLikelyLink(url, html, ["book", "schedule", "appointment", "calendly", "cal.com"]),
    callbackFormUrl: findLikelyLink(url, html, ["contact", "quote", "callback", "estimate"]),
  };

  try {
    const ai = await aiJSON<SetupScanResult>({
      system: "Extract setup fields for an AI missed-call recovery tool. Return JSON only. contractorType must be one of the allowed values or null.",
      prompt: JSON.stringify({
        allowedContractorTypes: CONTRACTOR_TYPES,
        website: url.toString(),
        title,
        description,
        visibleText: text.slice(0, 9000),
      }),
    });
    return {
      ...fallback,
      ...ai,
      website: url.toString(),
      contractorType: ai.contractorType && CONTRACTOR_TYPES.includes(ai.contractorType) ? ai.contractorType : fallback.contractorType,
    };
  } catch {
    return fallback;
  }
}
