import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

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

      <Section title="Consent">
        Customers who call your business and leave a voicemail or reply to an AI
        follow-up are considered to have given <strong>express consent</strong> to
        receive related SMS replies about their service request. We do not send
        marketing or promotional SMS from this app — messages are limited to lead
        qualification, scheduling, and callback confirmations.
      </Section>

      <Section title="Standard disclosure (appended to first reply)">
        <code className="block whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
{`{Business Name}: Thanks for reaching out. Reply STOP to opt out, HELP for help.
Msg & data rates may apply. Msg frequency varies.`}
        </code>
      </Section>

      <Section title="Opt-out handling">
        Replies of <strong>STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT</strong>
        automatically end the conversation and block future SMS to that number.
        Replies of <strong>HELP</strong> or <strong>INFO</strong> trigger an
        automated help response with your business name and contact info.
      </Section>

      <Section title="A2P 10DLC registration">
        Before sending production SMS in the US, your Twilio number must be
        registered to an approved A2P 10DLC brand and campaign. CallRescue AI uses
        the <em>Customer Care</em> use case. Until your campaign is approved,
        outbound SMS runs in test mode only.
      </Section>

      <Section title="Call recording &amp; AI voice">
        If the AI voice agent answers a call, the caller is informed at the start
        that the call is handled by an AI assistant and may be recorded for
        quality and lead-handling purposes. Recordings and transcripts are stored
        only for your business and never shared with third parties.
      </Section>

      <Section title="Data &amp; retention">
        Caller phone numbers, transcripts, and SMS threads are stored in your
        private workspace and protected by row-level security. You can delete a
        lead at any time, which permanently removes its transcript, SMS history,
        and recordings.
      </Section>

      <Section title="Carrier fees">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}