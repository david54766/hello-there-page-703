import { Card } from "@/components/ui/card";
import { ShieldCheck, FileText, Phone, MessageSquare, AlertTriangle, CheckCircle, Globe, Building2, User, Hash } from "lucide-react";

export function SmsComplianceCard() {
  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">SMS &amp; Voice Compliance</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        CallRecover AI sends SMS and places calls through Twilio. To stay compliant
        with US carrier rules (A2P 10DLC), TCPA, and CTIA guidelines, the following
        disclosures apply to every message your business sends through this app.
      </p>

      <Section title="Consent" icon={<User className="h-4 w-4" />}>
        Consent to receive SMS is <strong>always optional</strong> and is{" "}
        <strong>never a condition</strong> of receiving a callback, scheduling
        service, or completing any transaction. Callers receive a callback from
        the business regardless of whether they agree to text messages.
        When given, consent is captured through a{" "}
        <strong>two-layer (double) opt-in</strong>: the AI voice agent collects
        the caller's message and verbally asks if they would <em>also</em> like a
        text confirmation (frequency, rates, STOP, and the "optional / not
        required" disclosure are stated in the same prompt). The verbal yes/no
        is recorded as proof. If the caller agrees and the number is mobile,
        one confirmation SMS is sent and no further messages are sent until the
        caller replies <strong>YES</strong>. Anyone who declines, or who is on
        a landline, still gets a callback — no SMS is attempted. We do not send
        marketing or promotional SMS — messages are limited to lead
        qualification, scheduling, and callback confirmations.
      </Section>

      <Section title="Standard disclosure (appended to first reply)" icon={<MessageSquare className="h-4 w-4" />}>
        <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`{Business Name}: Thanks for reaching out. Reply STOP to opt out, HELP for help.
Msg & data rates may apply. Msg frequency varies.`}
        </code>
      </Section>

      <Section title="Opt-out handling" icon={<AlertTriangle className="h-4 w-4" />}>
        Replies of <strong>STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, OPTOUT, REVOKE</strong>
        automatically end the conversation and block future SMS to that number.
        Replies of <strong>HELP</strong> or <strong>INFO</strong> trigger an
        automated help response with your business name and contact info.
      </Section>

      <Section title="Opt-in keywords" icon={<CheckCircle className="h-4 w-4" />}>
        Customers can text any of the following keywords to opt in to SMS
        communications from CallRecover:
        <div className="mt-2 flex flex-wrap gap-2">
          {["YES", "START", "JOIN", "BEGIN", "CONFIRM", "UNSTOP"].map((k) => (
            <span key={k} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{k}</span>
          ))}
        </div>
      </Section>

      <Section title="Opt-in message" icon={<MessageSquare className="h-4 w-4" />}>
        When a customer texts an opt-in keyword, they receive this automated reply:
        <code className="mt-2 block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`CallRecover: You are now subscribed to SMS updates for your service requests.
Reply STOP to opt out, HELP for help. Msg & data rates may apply.
Msg frequency varies. Privacy: https://callrecover.net/privacy-policy`}
        </code>
      </Section>

      <Section title="A2P 10DLC campaign registration" icon={<FileText className="h-4 w-4" />}>
        Before sending production SMS in the US, your Twilio number must be
        registered to an approved A2P 10DLC brand and campaign. CallRecover AI uses
        the <em>Customer Care</em> use case. Until your campaign is approved,
        outbound SMS runs in test mode only.
      </Section>

      <Section title="Call recording &amp; AI voice" icon={<Phone className="h-4 w-4" />}>
        When a missed call is forwarded, the AI voice agent identifies itself as
        an AI assistant at the start and discloses that the call is recorded for
        quality and lead-handling purposes. The agent collects the caller's
        message and asks whether they would also like an optional SMS
        confirmation. Frequency, rates, and STOP instructions are disclosed in
        the same prompt. The business calls the customer back whether the
        customer accepts or declines SMS.
        Recordings, transcripts, and the verbal yes/no are stored only for your
        business and never shared with third parties.
      </Section>

      <Section title="Data &amp; retention" icon={<Globe className="h-4 w-4" />}>
        Caller phone numbers, transcripts, and SMS threads are stored in your
        private workspace and protected by row-level security. You can delete a
        lead at any time, which permanently removes its transcript, SMS history,
        and recordings.
      </Section>

      <Section title="Carrier fees" icon={<Hash className="h-4 w-4" />}>
        SMS and voice traffic is billed by Twilio at standard carrier rates,
        including A2P 10DLC per-message surcharges. CallRecover AI does not mark
        up carrier fees.
      </Section>

      <p className="border-t pt-3 text-xs text-muted-foreground">
        Twilio is a registered trademark of Twilio Inc. CallRecover AI is an
        independent product and is not affiliated with or endorsed by Twilio.
        Twilio's full messaging policy:{" "}
        <a className="underline" href="https://www.twilio.com/legal/messaging-policy" target="_blank" rel="noreferrer">
          twilio.com/legal/messaging-policy
        </a>.
      </p>
    </Card>
  );
}

export function CampaignRegistrationCard() {
  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Twilio A2P 10DLC Campaign Registration</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        To send SMS messages through Twilio in the United States, your business must
        register an A2P 10DLC (Application-to-Person 10-Digit Long Code) campaign.
        Below are the full registration details required by carriers and The Campaign Registry (TCR).
      </p>

      <Section title="Brand Information" icon={<Building2 className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><strong>Legal Brand Name:</strong> Classroom Panda LLC dba CallRecover</li>
          <li><strong>DBA / Product Name:</strong> CallRecover</li>
          <li><strong>Brand Type:</strong> Private (non-publicly traded)</li>
          <li><strong>Legal Entity Type:</strong> LLC</li>
          <li><strong>Business Phone:</strong> (878) 234-0176</li>
          <li><strong>Business Email:</strong> David@callrecover.net</li>
          <li><strong>Contact Person:</strong> Dan</li>
        </ul>
      </Section>

      <Section title="Campaign Details" icon={<FileText className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><strong>Campaign Name:</strong> CallRecover — Customer Care &amp; Lead Follow-up</li>
          <li><strong>Use Case:</strong> Customer Care (non-marketing, service-related messaging)</li>
          <li><strong>Sub-use Case:</strong> Appointment reminders, lead qualification, callback scheduling</li>
          <li><strong>Message Content:</strong> Only transactional/service messages — no promotional or marketing content</li>
          <li><strong>Two-way Messaging:</strong> Yes — customers can reply to schedule, ask questions, or opt out</li>
          <li><strong>Embedded Link:</strong> No — messages do not contain URLs</li>
          <li><strong>Embedded Phone:</strong> No — messages do not contain phone numbers</li>
          <li><strong>Number of Messages:</strong> 1–3 messages per conversation, frequency varies by customer need</li>
        </ul>
      </Section>

      <Section title="Sample Messages (required by carriers)" icon={<MessageSquare className="h-4 w-4" />}>
        <div className="space-y-2">
          <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`Hi Dan, this is Classroom Panda LLC dba CallRecover. We received your voicemail about a service request.
Can we schedule a quick call? Reply with a time that works. Reply STOP to opt out,
HELP for help. Msg & data rates may apply.`}
          </code>
          <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`Thanks Dan! Classroom Panda LLC dba CallRecover will call you back shortly at (878) 234-0176. If you need to reschedule,
just reply here or email David@callrecover.net. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`}
          </code>
          <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`Hi Dan, just confirming your appointment with Classroom Panda LLC dba CallRecover for May 27th.
Reply CONFIRM or call us if you need to change it. Reply STOP to opt out, HELP for help.`}
          </code>
        </div>
      </Section>

      <Section title="Opt-In & Consent Mechanism" icon={<CheckCircle className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><strong>Consent is optional, never required:</strong> SMS opt-in is <strong>not a condition</strong> of receiving a callback, scheduling service, or completing any transaction. Customers receive a callback regardless of whether they agree to text messages.</li>
          <li><strong>AI Voice Agent — Verbal Consent (Layer 1, primary):</strong> When a customer calls a business that uses CallRecover and the call is missed, it forwards to our AI voice agent. After taking the message, the agent asks: "Would you also like a text confirmation at this number? This is optional — we'll call you back either way. Msg frequency varies, msg &amp; data rates may apply, reply STOP to opt out." The recorded verbal yes/no is stored as proof.</li>
          <li><strong>SMS Confirmation — YES Reply (Layer 2, primary):</strong> If verbal consent is given and the number is mobile, one confirmation text is sent: "[Business] here — reply YES to confirm text updates about your service request. Reply STOP to opt out, HELP for help. Msg freq varies. Msg &amp; data rates may apply." No further messages are sent until the caller replies <strong>YES</strong>.</li>
          <li><strong>Landline / decline fallback:</strong> If the caller is on a landline or declines SMS, no text is attempted. The agent confirms the message is logged and the business will call back. Service is unaffected.</li>
          <li><strong>Web Form (Secondary CTA):</strong> Customers may also opt in at <a className="underline" href="https://callrecover.net/sms-opt-in" target="_blank" rel="noreferrer">https://callrecover.net/sms-opt-in</a>. The form collects full name and mobile number, and requires an unchecked-by-default consent checkbox with the disclosure: "Consent to receive SMS messages is not required to receive a callback, schedule service, or complete any transaction. You will receive a callback from the business regardless of whether you agree to text messages. Consent is not a condition of purchase."</li>
          <li><strong>Consent Record:</strong> Every opt-in is logged with timestamp, phone number, source (AI voice agent / SMS YES reply / web form / SMS keyword), IP address (where applicable), user agent (where applicable), call recording or transcript reference, and the exact consent disclosure text or audio prompt shown to the customer.</li>
          <li><strong>Consent Disclaimers:</strong> Customers are informed verbally (on the call) and in writing (in the SMS confirmation) that message frequency varies and that standard messaging rates apply.</li>
        </ul>
      </Section>

      <Section title="TCR Campaign Consent Field" icon={<FileText className="h-4 w-4" />}>
        <p className="mb-2 text-sm text-muted-foreground">
          Use this wording for the Twilio/TCR "How do end users consent" field:
        </p>
        <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`Consent to receive SMS is optional and is NOT a condition of receiving a callback, scheduling service, or completing any transaction. Customers receive a callback from the business regardless of whether they agree to SMS.

Opt-in is collected two ways:

1) AI voice agent (verbal, double opt-in): When a customer's call to a CallRecover business goes unanswered, it forwards to our AI voice agent. After taking the message, the agent asks: "Would you also like a text confirmation at this number? This is optional — we'll call you back either way. Msg frequency varies, msg & data rates may apply, reply STOP to opt out." The recorded verbal "yes" is stored as proof. If the caller agrees and the number is mobile, we send one confirmation SMS and only continue messaging after they reply YES.

2) Web form: https://callrecover.net/sms-opt-in — customers enter their name + mobile number and must check an unchecked-by-default consent box. The disclosure on the form states verbatim: "Consent is not a condition of purchase."

Every opt-in is logged with timestamp, phone, source, IP/user-agent (web) or call recording reference (voice), and the exact disclosure text shown.`}
        </code>
      </Section>

      <Section title="Opt-Out Language" icon={<AlertTriangle className="h-4 w-4" />}>
        <p className="text-sm text-muted-foreground">
          Every first outbound message in a thread automatically includes:
        </p>
        <code className="mt-2 block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`Reply STOP to opt out, HELP for help. Msg & data rates may apply. Msg frequency varies.`}
        </code>
        <p className="mt-2 text-sm text-muted-foreground">
          STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, OPTOUT, and REVOKE are
          automatically handled and permanently block future messages to that number.
        </p>
      </Section>

      <Section title="Terms & Conditions URL" icon={<Globe className="h-4 w-4" />}>
        <p className="text-sm text-muted-foreground">
          View our full Terms & Conditions here:
        </p>
        <p className="mt-1 text-sm">
          <a className="underline text-primary" href="https://callrecover.net/terms" target="_blank" rel="noreferrer">https://callrecover.net/terms</a>
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Description of the SMS program and purpose</li>
          <li>Message frequency disclosure ("Message frequency varies")</li>
          <li>Standard rate disclaimer ("Msg & data rates may apply")</li>
          <li>Opt-out instructions ("Reply STOP to cancel")</li>
          <li>Help instructions ("Reply HELP for assistance")</li>
          <li>Business contact information</li>
          <li>Privacy policy link covering data use and retention</li>
        </ul>
      </Section>

      <Section title="Privacy Policy URL" icon={<ShieldCheck className="h-4 w-4" />}>
        <p className="text-sm text-muted-foreground">
          View our full Privacy Policy here:
        </p>
        <p className="mt-1 text-sm">
          <a className="underline text-primary" href="https://callrecover.net/privacy-policy" target="_blank" rel="noreferrer">https://callrecover.net/privacy-policy</a>
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>What customer data is collected (name, phone, address, service details)</li>
          <li>How data is used (scheduling, follow-up, internal records)</li>
          <li>Who data is shared with (Twilio for delivery, no third-party marketing)</li>
          <li>Data retention period and deletion rights</li>
          <li>How customers can opt out of SMS communications</li>
        </ul>
      </Section>

      <Section title="Campaign Attributes" icon={<Hash className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><strong>Campaign Type:</strong> Standard — low volume, mixed use</li>
          <li><strong>Direct Lending:</strong> No</li>
          <li><strong>Age-Gated Content:</strong> No</li>
          <li><strong>Affiliate Marketing:</strong> No</li>
          <li><strong>Subscriber Opt-In:</strong> Required and verified</li>
          <li><strong>Subscriber Opt-Out:</strong> Required and automated</li>
          <li><strong>Subscriber Help:</strong> Required and automated</li>
        </ul>
      </Section>

      <Section title="Registration Status" icon={<CheckCircle className="h-4 w-4" />}>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
            <strong>Brand:</strong> Pending TCR verification (submit EIN + business docs)
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
            <strong>Campaign:</strong> Pending carrier approval (typically 1–3 business days after brand approval)
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <strong>Phone Number:</strong> Assigned and linked to campaign upon approval
          </div>
          <p className="mt-2 text-xs">
            Until both brand and campaign are approved, SMS traffic may be filtered or
            subject to higher carrier fees. Do not send bulk or marketing messages before
            full approval.
          </p>
        </div>
      </Section>

      <p className="border-t pt-3 text-xs text-muted-foreground">
        The Campaign Registry (TCR) and US carriers (AT&amp;T, T-Mobile, Verizon) require
        this information to reduce spam and ensure legitimate business messaging.
        Registration is mandatory for all A2P 10DLC traffic in the US. For more info:{" "}
        <a className="underline" href="https://www.twilio.com/a2p-10dlc" target="_blank" rel="noreferrer">
          twilio.com/a2p-10dlc
        </a>{" "}
        and{" "}
        <a className="underline" href="https://www.campaignregistry.com/" target="_blank" rel="noreferrer">
          campaignregistry.com
        </a>.
      </p>
    </Card>
  );
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {title}
      </h3>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
