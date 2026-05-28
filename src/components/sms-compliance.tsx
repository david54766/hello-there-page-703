import { Card } from "@/components/ui/card";
import { ShieldCheck, FileText, Phone, MessageSquare, AlertTriangle, CheckCircle, Globe, Building2, User, Hash } from "lucide-react";

export function SmsComplianceCard() {
  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">SMS &amp; voice compliance</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        CallRescue AI sends SMS and places calls through Twilio. To stay compliant
        with US carrier rules (A2P 10DLC), TCPA, and CTIA guidelines, the following
        disclosures apply to every message your business sends through this app.
      </p>

      <Section title="Consent" icon={<User className="h-4 w-4" />}>
        Customers who call your business and leave a voicemail or reply to an AI
        follow-up are considered to have given <strong>express consent</strong> to
        receive related SMS replies about their service request. We do not send
        marketing or promotional SMS from this app — messages are limited to lead
        qualification, scheduling, and callback confirmations.
      </Section>

      <Section title="Standard disclosure (appended to first reply)" icon={<MessageSquare className="h-4 w-4" />}>
        <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`{Business Name}: Thanks for reaching out. Reply STOP to opt out, HELP for help.
Msg & data rates may apply. Msg frequency varies.`}
        </code>
      </Section>

      <Section title="Opt-out handling" icon={<AlertTriangle className="h-4 w-4" />}>
        Replies of <strong>STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT</strong>
        automatically end the conversation and block future SMS to that number.
        Replies of <strong>HELP</strong> or <strong>INFO</strong> trigger an
        automated help response with your business name and contact info.
      </Section>

      <Section title="A2P 10DLC campaign registration" icon={<FileText className="h-4 w-4" />}>
        Before sending production SMS in the US, your Twilio number must be
        registered to an approved A2P 10DLC brand and campaign. CallRescue AI uses
        the <em>Customer Care</em> use case. Until your campaign is approved,
        outbound SMS runs in test mode only.
      </Section>

      <Section title="Call recording &amp; AI voice" icon={<Phone className="h-4 w-4" />}>
        If the AI voice agent answers a call, the caller is informed at the start
        that the call is handled by an AI assistant and may be recorded for
        quality and lead-handling purposes. Recordings and transcripts are stored
        only for your business and never shared with third parties.
      </Section>

      <Section title="Data &amp; retention" icon={<Globe className="h-4 w-4" />}>
        Caller phone numbers, transcripts, and SMS threads are stored in your
        private workspace and protected by row-level security. You can delete a
        lead at any time, which permanently removes its transcript, SMS history,
        and recordings.
      </Section>

      <Section title="Carrier fees" icon={<Hash className="h-4 w-4" />}>
        SMS and voice traffic is billed by Twilio at standard carrier rates,
        including A2P 10DLC per-message surcharges. CallRescue AI does not mark
        up carrier fees.
      </Section>

      <p className="border-t pt-3 text-xs text-muted-foreground">
        Twilio is a registered trademark of Twilio Inc. CallRescue AI is an
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
          <li><strong>Brand Name:</strong> CallRescue</li>
          <li><strong>Brand Type:</strong> Private (non-publicly traded)</li>
          <li><strong>Legal Entity Type:</strong> LLC</li>
          <li><strong>Business Phone:</strong> (878) 234-0176</li>
          <li><strong>Business Email:</strong> David@callrecover.net</li>
          <li><strong>Contact Person:</strong> Dan</li>
        </ul>
      </Section>

      <Section title="Campaign Details" icon={<FileText className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><strong>Campaign Name:</strong> CallRescue — Customer Care &amp; Lead Follow-up</li>
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
{`Hi Dan, this is CallRescue. We received your voicemail about a service request.
Can we schedule a quick call? Reply YES or a time that works. Reply STOP to opt out,
HELP for help. Msg & data rates may apply.`}
          </code>
          <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`Thanks Dan! We'll call you back shortly at (878) 234-0176. If you need to reschedule,
just reply here or email David@callrecover.net. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`}
          </code>
          <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`Hi Dan, just confirming your appointment with CallRescue for May 27th.
Reply CONFIRM or call us if you need to change it. Reply STOP to opt out, HELP for help.`}
          </code>
        </div>
      </Section>

      <Section title="Opt-In & Consent Mechanism" icon={<CheckCircle className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><strong>Primary Consent:</strong> Express consent is obtained when a customer calls your business phone number and leaves a voicemail, or when they reply to an initial AI voice call</li>
          <li><strong>Written Consent:</strong> Optionally collected through web forms, paper contracts, or digital agreements with clear SMS terms</li>
          <li><strong>Consent Record:</strong> Timestamp and method of consent is stored per lead in the CallRescue AI backend</li>
          <li><strong>Consent Disclaimers:</strong> Customers are informed that message frequency varies and that standard messaging rates apply</li>
        </ul>
      </Section>

      <Section title="Opt-Out Language" icon={<AlertTriangle className="h-4 w-4" />}>
        <p className="text-sm text-muted-foreground">
          Every first outbound message in a thread automatically includes:
        </p>
        <code className="mt-2 block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`Reply STOP to opt out, HELP for help. Msg & data rates may apply. Msg frequency varies.`}
        </code>
        <p className="mt-2 text-sm text-muted-foreground">
          STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, and QUIT are automatically handled
          and permanently block future messages to that number.
        </p>
      </Section>

      <Section title="Terms & Conditions URL" icon={<Globe className="h-4 w-4" />}>
        <p className="text-sm text-muted-foreground">
          View our full Terms & Conditions here:
        </p>
        <p className="mt-1 text-sm">
          <a className="underline text-primary" href="/terms" target="_blank" rel="noreferrer">/terms</a>
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
          Your privacy policy must disclose:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
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
