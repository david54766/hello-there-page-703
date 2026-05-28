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
        ],
      };
    case "att":
      return {
        title: "AT&T — No Answer Forwarding",
        dialCode: `**61*${digits}#`,
        steps: [
          `Open your phone dialer`,
          `Dial ${`**61*${digits}#`} and press call`,
          `Wait for the confirmation message`,
          `Hang up — forwarding is active`,
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
