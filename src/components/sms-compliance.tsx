import { Card } from "@/components/ui/card";
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  FileText,
  Globe,
  Hash,
  MessageSquare,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  AI_VERBAL_SMS_OPT_IN_PROMPT,
  DOUBLE_OPT_IN_CONFIRMATION_SMS,
  TCR_SMS_CONSENT_DESCRIPTION,
  WEB_FORM_SMS_CONSENT_TEXT,
} from "@/lib/sms-consent-copy";

export function SmsComplianceCard() {
  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">SMS &amp; Voice Compliance</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        CallRecover AI sends SMS and places calls through Twilio. These
        disclosures apply to every customer conversation handled through the
        app.
      </p>

      <Section title="Consent" icon={<User className="h-4 w-4" />}>
        Consent to receive SMS is always optional and is never a condition of
        receiving a callback, scheduling service, or completing any transaction.
        Callers receive a callback from the business regardless of whether they
        agree to text messages. Consent is captured through verbal + SMS double
        opt-in: the AI agent asks <em>"{AI_VERBAL_SMS_OPT_IN_PROMPT}"</em>. If
        the caller says yes and called from a mobile number, CallRecover sends
        the confirmation SMS and sends no further messages until the caller
        replies <strong>YES</strong>.
      </Section>

      <Section title="Confirmation SMS" icon={<MessageSquare className="h-4 w-4" />}>
        <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
          {DOUBLE_OPT_IN_CONFIRMATION_SMS}
        </code>
      </Section>

      <Section title="Opt-out handling" icon={<AlertTriangle className="h-4 w-4" />}>
        Replies of <strong>STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, OPTOUT, REVOKE</strong>{" "}
        automatically end the conversation and block future SMS to that number.
        Replies of <strong>HELP</strong> or <strong>INFO</strong> trigger an
        automated help response with support details.
      </Section>

      <Section title="Opt-in keywords" icon={<CheckCircle className="h-4 w-4" />}>
        Customers can text any of the following keywords to confirm or resume
        SMS communications from CallRecover:
        <div className="mt-2 flex flex-wrap gap-2">
          {["YES", "START", "JOIN", "BEGIN", "CONFIRM", "UNSTOP"].map((keyword) => (
            <span key={keyword} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {keyword}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Call recording &amp; AI voice" icon={<Phone className="h-4 w-4" />}>
        When a missed call is forwarded, the AI voice agent identifies itself as
        an AI assistant and records the call for quality and lead-handling
        purposes. Call recording, transcript, number, timestamp, and YES reply
        are stored as consent proof.
      </Section>

      <Section title="Data &amp; retention" icon={<Globe className="h-4 w-4" />}>
        Caller phone numbers, transcripts, SMS threads, and consent records are
        stored in the private CallRecover workspace and protected by row-level
        security.
      </Section>

      <Section title="Carrier fees" icon={<Hash className="h-4 w-4" />}>
        SMS and voice traffic is billed by Twilio at standard carrier rates,
        including A2P 10DLC per-message surcharges. CallRecover AI does not mark
        up carrier fees.
      </Section>

      <p className="border-t pt-3 text-xs text-muted-foreground">
        Twilio is a registered trademark of Twilio Inc. CallRecover AI is an
        independent product and is not affiliated with or endorsed by Twilio.
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
        Use this section when completing Twilio/TCR campaign registration for
        Classroom Panda LLC dba CallRecover.
      </p>

      <Section title="Brand Information" icon={<Building2 className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><strong>Legal Brand Name:</strong> Classroom Panda LLC dba CallRecover</li>
          <li><strong>DBA / Product Name:</strong> CallRecover</li>
          <li><strong>Brand Type:</strong> Private (non-publicly traded)</li>
          <li><strong>Legal Entity Type:</strong> LLC</li>
          <li><strong>Business Phone:</strong> (701) 203-1073</li>
          <li><strong>Business Email:</strong> support@callrecover.net</li>
        </ul>
      </Section>

      <Section title="Campaign Details" icon={<FileText className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><strong>Campaign Name:</strong> CallRecover - Customer Care &amp; Lead Follow-up</li>
          <li><strong>Use Case:</strong> Customer Care (non-marketing, service-related messaging)</li>
          <li><strong>Sub-use Case:</strong> Appointment reminders, lead qualification, callback scheduling</li>
          <li><strong>Message Content:</strong> Only transactional/service messages - no promotional or marketing content</li>
          <li><strong>Two-way Messaging:</strong> Yes - customers can reply to schedule, ask questions, or opt out</li>
          <li><strong>Number of Messages:</strong> 1-3 messages per conversation, frequency varies by customer need</li>
        </ul>
      </Section>

      <Section title="Sample Messages" icon={<MessageSquare className="h-4 w-4" />}>
        <div className="space-y-2">
          <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
            {DOUBLE_OPT_IN_CONFIRMATION_SMS}
          </code>
          <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`Classroom Panda LLC dba CallRecover: Thanks, you are confirmed for SMS updates. The business received your message and will call you back. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`}
          </code>
          <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`Classroom Panda LLC dba CallRecover: Your appointment is confirmed. Reply here if you need to change it. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`}
          </code>
        </div>
      </Section>

      <Section title="Opt-In & Consent Mechanism" icon={<CheckCircle className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><strong>Verbal + SMS double opt-in:</strong> Our AI voice agent answers the caller's forwarded call, takes their details, then asks: "{AI_VERBAL_SMS_OPT_IN_PROMPT}"</li>
          <li><strong>SMS confirmation:</strong> If they say yes and called from a mobile, we send one message: "{DOUBLE_OPT_IN_CONFIRMATION_SMS}"</li>
          <li><strong>YES required:</strong> Only after they reply <strong>YES</strong> do further messages send.</li>
          <li><strong>Consent proof:</strong> Call recording, transcript, number, timestamp, and YES reply are stored.</li>
          <li><strong>Web form:</strong> Visitor enters name and mobile at <a className="underline" href="https://callrecover.net/sms-opt-in" target="_blank" rel="noreferrer">https://callrecover.net/sms-opt-in</a> and checks an unchecked box agreeing to receive transactional SMS from Classroom Panda LLC dba CallRecover, with STOP/HELP language and "Consent is not a condition of purchase."</li>
        </ul>
      </Section>

      <Section title="TCR Campaign Consent Field" icon={<FileText className="h-4 w-4" />}>
        <p className="mb-2 text-sm text-muted-foreground">
          Use this wording for the Twilio/TCR "How do end users consent" field:
        </p>
        <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
          {TCR_SMS_CONSENT_DESCRIPTION}
        </code>
      </Section>

      <Section title="Web Form Consent Text Stored" icon={<Globe className="h-4 w-4" />}>
        <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
          {WEB_FORM_SMS_CONSENT_TEXT}
        </code>
      </Section>

      <Section title="Opt-Out Language" icon={<AlertTriangle className="h-4 w-4" />}>
        <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
          Reply STOP to opt out, HELP for help. Msg &amp; data rates may apply.
        </code>
      </Section>

      <Section title="Campaign Attributes" icon={<Hash className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><strong>Campaign Type:</strong> Standard - low volume, mixed use</li>
          <li><strong>Direct Lending:</strong> No</li>
          <li><strong>Age-Gated Content:</strong> No</li>
          <li><strong>Affiliate Marketing:</strong> No</li>
          <li><strong>Subscriber Opt-In:</strong> Required and verified</li>
          <li><strong>Subscriber Opt-Out:</strong> Required and automated</li>
          <li><strong>Subscriber Help:</strong> Required and automated</li>
        </ul>
      </Section>
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
