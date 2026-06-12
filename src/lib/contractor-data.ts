import { AI_VERBAL_SMS_OPT_IN_PROMPT, DOUBLE_OPT_IN_CONFIRMATION_SMS } from "@/lib/sms-consent-copy";

export const CONTRACTOR_TYPES = [
  { value: "roofing", label: "Roofing" },
  { value: "plumbing", label: "Plumbing" },
  { value: "hvac", label: "HVAC" },
  { value: "electrical", label: "Electrical" },
  { value: "landscaping", label: "Landscaping" },
  { value: "pest_control", label: "Pest Control" },
  { value: "restoration", label: "Restoration" },
  { value: "general_contractor", label: "General Contractor" },
  { value: "painting", label: "Painting" },
  { value: "concrete", label: "Concrete" },
  { value: "pool_services", label: "Pool Services" },
  { value: "pressure_washing", label: "Pressure Washing" },
  { value: "tree_services", label: "Tree Services" },
  { value: "flooring", label: "Flooring" },
  { value: "handyman", label: "Handyman" },
  { value: "solar", label: "Solar" },
  { value: "fencing", label: "Fencing" },
] as const;

export type ContractorType = (typeof CONTRACTOR_TYPES)[number]["value"];

export const CARRIERS = [
  { value: "verizon", label: "Verizon" },
  { value: "att", label: "AT&T" },
  { value: "tmobile", label: "T-Mobile" },
  { value: "comcast", label: "Comcast" },
  { value: "ringcentral", label: "RingCentral" },
  { value: "google_voice", label: "Google Voice" },
  { value: "other", label: "Other" },
] as const;

export type Carrier = (typeof CARRIERS)[number]["value"];

const FORWARDING_FEE_NOTICE =
  "Carrier notice: your provider may charge additional fees or use plan minutes for call forwarding. Check your carrier's terms if you are unsure.";

export function getForwardingInstructions(carrier: Carrier, twilioNumber: string) {
  const digits = twilioNumber.replace(/\D/g, "");
  switch (carrier) {
    case "verizon":
      return {
        title: "Verizon — Conditional Call Forwarding",
        dialCode: `*71${digits}`,
        steps: [
          `Open your phone dialer`,
          `Dial ${`*71${digits}`} and press call`,
          `Listen for confirmation tone, then hang up`,
          `Your missed calls will now forward to CallRecover`,
          FORWARDING_FEE_NOTICE,
        ],
      };
    case "att":
      // AT&T wireless requires the 1 country-code prefix and uses *004* to set
      // busy + no-answer + unreachable forwarding in one shot. The bare GSM
      // **61* code is rejected on most AT&T lines.
      const attTarget = digits.length === 10 ? `1${digits}` : digits;
      return {
        title: "AT&T — No Answer Forwarding",
        dialCode: `*004*${attTarget}#`,
        steps: [
          `Open your phone dialer`,
          `Dial ${`*004*${attTarget}#`} and press call`,
          `Wait for the confirmation message`,
          `Hang up — forwarding is active for busy, no-answer, and unreachable calls`,
          `To turn it off later, dial ##004#`,
          FORWARDING_FEE_NOTICE,
        ],
      };
    case "tmobile":
      return {
        title: "T-Mobile — Conditional Forwarding",
        dialCode: `**61*${digits}#`,
        steps: [
          `Open your phone dialer`,
          `Dial ${`**61*${digits}#`} and press call`,
          `Wait for confirmation, then hang up`,
          FORWARDING_FEE_NOTICE,
        ],
      };
    case "comcast":
      return {
        title: "Comcast / Xfinity Voice",
        dialCode: `*72${digits}`,
        steps: [
          `Sign in to your Xfinity Voice account or dial ${`*72${digits}`}`,
          `Enable "Forward When No Answer" and enter the number above`,
          `Save changes`,
          FORWARDING_FEE_NOTICE,
        ],
      };
    case "ringcentral":
      return {
        title: "RingCentral",
        dialCode: digits,
        steps: [
          `Sign in to your RingCentral admin portal`,
          `Go to Phone System → Users → your line → Call Handling`,
          `Add a rule: When unanswered after 20 seconds, forward to ${digits}`,
          `Save`,
          FORWARDING_FEE_NOTICE,
        ],
      };
    case "google_voice":
      return {
        title: "Google Voice",
        dialCode: digits,
        steps: [
          `Open voice.google.com → Settings → Calls`,
          `Under "Forward calls to" add ${digits}`,
          `Enable "Forward when no answer"`,
          FORWARDING_FEE_NOTICE,
        ],
      };
    default:
      return {
        title: "Generic Forwarding",
        dialCode: `*72${digits}`,
        steps: [
          `Contact your carrier and ask to enable conditional call forwarding`,
          `Forward unanswered calls to ${digits}`,
          `Most carriers use ${`*72${digits}`} or ${`**61*${digits}#`}`,
          FORWARDING_FEE_NOTICE,
        ],
      };
  }
}

export function getSmsTemplate(contractorType: string | null | undefined, businessName: string) {
  switch (contractorType) {
    case "roofing":
      return `Thanks for calling ${businessName}. We got your message about the roof. Would you like an immediate callback?`;
    case "plumbing":
      return `Thanks for calling ${businessName}. Is this an emergency plumbing issue or something we can schedule?`;
    case "hvac":
      return `Thanks for calling ${businessName}. Are you currently without heating or cooling?`;
    case "electrical":
      return `Thanks for calling ${businessName}. Is this an electrical emergency or a scheduled job?`;
    default:
      return `Thanks for calling ${businessName}. We missed your call — would you like an immediate callback or to schedule a time?`;
  }
}

// ---- Trade-tailored standard voice script ----
// Returns a short, direct first message + a system prompt that keeps
// every reply to 1-2 sentences and (optionally) offers to book a consult.

const TRADE_QUALIFIER: Record<string, string> = {
  roofing: "Is this a leak or general repair?",
  plumbing: "Is water actively running, or contained?",
  hvac: "Are you currently without heat or cooling?",
  electrical: "Is there a safety concern like sparks or smell of burning?",
  landscaping: "Is this for ongoing maintenance or a one-time job?",
  pest_control: "What kind of pest are you dealing with?",
  restoration: "Is there active water, smoke, or mold damage right now?",
  painting: "Is this interior or exterior work?",
  pool_services: "Is the pool currently in use or being opened/closed?",
  tree_services: "Is the tree damaged, leaning, or down?",
  solar: "Is this for a new install or existing system service?",
};

const TRADE_ASSESSMENT_WORDS: Record<string, string> = {
  roofing: "roofing assessment",
  plumbing: "plumbing assessment",
  hvac: "HVAC assessment",
  electrical: "electrical assessment",
  landscaping: "landscaping request",
  pest_control: "pest control request",
  restoration: "restoration assessment",
  general_contractor: "project assessment",
  painting: "painting estimate request",
  concrete: "concrete estimate request",
  pool_services: "pool service request",
  pressure_washing: "pressure washing request",
  tree_services: "tree service request",
  flooring: "flooring estimate request",
  handyman: "repair request",
  solar: "solar service request",
  fencing: "fencing estimate request",
};

const TRADE_SCHEDULING_WORDS: Record<string, string> = {
  roofing: "roof inspections and estimates",
  plumbing: "plumbing appointments and estimates",
  hvac: "HVAC appointments and estimates",
  electrical: "electrical appointments and estimates",
  landscaping: "landscaping appointments and estimates",
  pest_control: "pest control appointments",
  restoration: "restoration appointments and estimates",
  general_contractor: "appointments and estimates",
  painting: "painting estimates",
  concrete: "concrete estimates",
  pool_services: "pool service appointments",
  pressure_washing: "pressure washing estimates",
  tree_services: "tree service estimates",
  flooring: "flooring estimates",
  handyman: "repair appointments and estimates",
  solar: "solar consultations and estimates",
  fencing: "fencing estimates",
};

export const DEFAULT_AGENT_NAME = "Alex";

function cleanAgentName(value: string | null | undefined) {
  const name = (value ?? "").trim();
  if (!name) return DEFAULT_AGENT_NAME;
  if (/\d/.test(name) || name.length > 32) return DEFAULT_AGENT_NAME;
  return name;
}

export function getStandardScript(
  contractorType: string | null | undefined,
  businessName: string,
  opts: { schedulingEnabled?: boolean; bookingUrl?: string | null; agentName?: string | null } = {},
): { firstMessage: string; systemPrompt: string } {
  const qualifier =
    (contractorType && TRADE_QUALIFIER[contractorType]) ||
    "Can you briefly describe what you need help with?";
  const agentName = cleanAgentName(opts.agentName);
  const assessment =
    (contractorType && TRADE_ASSESSMENT_WORDS[contractorType]) ||
    "request";
  const schedulingPhrase =
    (contractorType && TRADE_SCHEDULING_WORDS[contractorType]) ||
    "appointments and estimates";
  const schedulingReady = Boolean(opts.schedulingEnabled && opts.bookingUrl);

  const firstMessage =
    `Thank you for calling ${businessName || "{business}"}. ` +
    `My name is ${agentName}. I am a virtual assistant here to help with a quick ${assessment}. ` +
    `If you would rather speak with a staff member, just say so and I will take a message for the team. ` +
    (schedulingReady
      ? `I can also help schedule ${schedulingPhrase}. `
      : "") +
    `How can we help today?`;

  const bookingLine =
    schedulingReady
      ? `After you have their name, number, and the reason for the call, you may offer scheduling with this exact wording: "I can help start scheduling ${schedulingPhrase}. The team will confirm the exact time if needed." If they want to schedule, share this booking link: ${opts.bookingUrl}. Do not invent appointment times, availability, prices, or technician names.`
      : `After you have their name, number, and the reason for the call, close with: "I'll have someone call you back shortly."`;

  const smsConsentLine =
    `After taking the message, ask exactly: "${AI_VERBAL_SMS_OPT_IN_PROMPT}" If the caller says yes and called from a mobile number, CallRecover sends one confirmation text message: "${DOUBLE_OPT_IN_CONFIRMATION_SMS}" Only after the caller replies YES do further text messages send. If the caller declines text messages, continue normally and confirm the business will call back. Never imply text message consent is required for callback, scheduling, service, or any transaction.`;

  const systemPrompt = [
    `You are ${agentName}, the virtual phone assistant for ${businessName || "{business}"}.`,
    `The opening message must disclose that you are a virtual assistant and give callers a quick path to staff follow-up.`,
    `Keep every reply to one or two short sentences. Be warm, calm, and direct.`,
    `If the caller says they do not want to speak with a virtual assistant, asks for a human, asks for staff, or sounds uncomfortable, do not argue. Collect their name, best callback number, and brief reason for calling, then say a staff member will follow up.`,
    `Step 1: confirm the caller's name and best callback number.`,
    `Step 2: ask one qualifying question - ${qualifier}`,
    `Step 3: ${smsConsentLine}`,
    `Step 4: ${bookingLine}`,
    `Never argue. Never repeat yourself. If the caller is frustrated or asks for a person, say someone will call them right back and end the call politely.`,
    `Do not invent prices, appointment times, or technician names.`,
  ].join(" ");

  return { firstMessage, systemPrompt };
}
