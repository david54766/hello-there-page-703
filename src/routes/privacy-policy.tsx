import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy · CallRecover" },
      { name: "description", content: "CallRecover privacy policy covering data collection, SMS practices, and opt-out rights." },
    ],
  }),
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4" /> Back</Link>
      </Button>
      <div className="mb-6 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Effective date: May 27, 2026 · Classroom Panda LLC dba CallRecover (David@callrecover.net · (878) 234-0176)
      </p>

      <Card className="space-y-6 p-6">
        <Section title="1. What data we collect">
          <p>We collect the following information when you interact with CallRecover:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Phone numbers (caller and business)</li>
            <li>AI voice agent call recordings and transcripts (including the verbal yes/no consent response)</li>
            <li>Names and service-related details you provide</li>
            <li>Appointment dates, times, and callback preferences</li>
            <li>SMS message history, timestamps, and double opt-in confirmation (YES reply)</li>
          </ul>
        </Section>

        <Section title="2. How we use your data">
          <p>Your data is used solely to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Transcribe and qualify calls handled by our AI voice agent</li>
            <li>Record and store verbal + SMS double opt-in consent as proof</li>
            <li>Send transactional SMS for appointment reminders, callbacks, and scheduling only after opt-in</li>
            <li>Store internal records for your service request</li>
            <li>Improve AI accuracy and response quality</li>
          </ul>
        </Section>

        <Section title="3. Mobile number non-sharing">
          <p>
            <strong>We do not share, sell, rent, or distribute your mobile phone number to any third parties for marketing purposes.</strong>
            Your number is used only for service-related communication between you and CallRecover. Twilio is used as the delivery provider; they process the number solely to deliver the message and do not use it for independent marketing.
          </p>
        </Section>

        <Section title="4. Message frequency">
          <p>
            Message frequency varies based on your service request. Most conversations involve 1–3 text messages. You will only receive messages related to a service request you initiated.
          </p>
        </Section>

        <Section title="5. Message and data rates may apply">
          <p>
            Standard messaging and data rates from your wireless carrier may apply to any text messages you receive from us. Contact your carrier for details on your plan.
          </p>
        </Section>

        <Section title="6. Data retention and deletion">
          <p>
            Your data is retained for as long as necessary to complete your service request and satisfy legal or business record requirements. You may request deletion of your personal data at any time by contacting us at David@callrecover.net. Deletion permanently removes transcripts, SMS history, and recordings.
          </p>
        </Section>

        <Section title="7. Opting out of SMS">
          <p>
            You can opt out of SMS communications at any time by replying <strong>STOP</strong>, <strong>STOPALL</strong>, <strong>UNSUBSCRIBE</strong>, <strong>CANCEL</strong>, <strong>END</strong>, <strong>QUIT</strong>, <strong>OPTOUT</strong>, or <strong>REVOKE</strong> to any message. Once opted out, you will no longer receive SMS from CallRecover unless you initiate a new service request and complete the double opt-in again.
          </p>
        </Section>

        <Section title="8. How to opt in (CTA)">
          <p>
            The primary opt-in path is a two-layer (double) opt-in handled by our AI voice agent: (1) when your call is forwarded to the agent, it verbally asks whether you would also like an optional text confirmation — your yes/no is recorded as proof; (2) if you say yes and your number is mobile, you receive one confirmation text and must reply <strong>YES</strong> to start receiving transactional SMS. If you say no or cannot receive SMS, no SMS is attempted. As a secondary path, you may also opt in at{" "}
            <Link to="/sms-opt-in" className="underline text-primary">callrecover.net/sms-opt-in</Link> (full name + mobile number + an unchecked-by-default consent checkbox), or by texting <strong>YES, START, JOIN, BEGIN, CONFIRM,</strong> or <strong>UNSTOP</strong> to our business number. Consent to receive SMS messages is not required to receive a callback, schedule service, or complete any transaction. You will receive a callback from the business regardless of whether you agree to text messages. Consent is not a condition of purchase.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            Your data is stored in a private workspace protected by row-level security and access controls. Only authorized CallRecover staff can view your information.
          </p>
        </Section>

        <Section title="9. Contact us">
          <p>
            For questions about this privacy policy or your data, contact:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Email: David@callrecover.net</li>
            <li>Phone: (878) 234-0176</li>
            <li>Business: Classroom Panda LLC dba CallRecover</li>
          </ul>
        </Section>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
