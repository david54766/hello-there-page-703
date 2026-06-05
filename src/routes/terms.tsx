import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms & Conditions · CallRecover" },
      { name: "description", content: "CallRecover terms of service covering SMS program terms, consent, and opt-out." },
    ],
  }),
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4" /> Back</Link>
      </Button>
      <div className="mb-6 flex items-center gap-2">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">Terms & Conditions</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Effective date: May 27, 2026 · Classroom Panda LLC dba CallRecover (David@callrecover.net · (878) 234-0176)
      </p>

      <Card className="space-y-6 p-6">
        <Section title="1. SMS Program Description">
          <p>
            CallRecover provides an automated customer care and lead follow-up service for home service contractors. When you call a business that uses CallRecover and the call is missed, the call is forwarded to our AI voice agent, which collects your message and verbally asks whether you'd like a text confirmation and priority callback details. If you verbally agree and your number is a mobile number, we send one confirmation SMS asking you to reply <strong>YES</strong> to complete a two-layer (double) opt-in. Only after that YES reply do we send transactional SMS to schedule appointments, confirm callbacks, and share service details. Landline callers receive a callback only — no SMS is attempted.
          </p>
        </Section>

        <Section title="2. Message Frequency">
          <p>
            <strong>Message frequency varies.</strong> Most conversations involve 1–3 text messages depending on your service needs. You will only receive messages after you (a) verbally consent on the call with our AI voice agent and (b) reply <strong>YES</strong> to the confirmation text.
          </p>
        </Section>

        <Section title="3. Message and Data Rates May Apply">
          <p>
            Standard messaging and data rates from your wireless carrier may apply to any text messages sent to or received from CallRecover. Contact your wireless carrier for pricing details.
          </p>
        </Section>

        <Section title="4. Opt-Out Instructions">
          <p>
            You can cancel SMS communications at any time by replying <strong>STOP</strong>, <strong>STOPALL</strong>, <strong>UNSUBSCRIBE</strong>, <strong>CANCEL</strong>, <strong>END</strong>, <strong>QUIT</strong>, <strong>OPTOUT</strong>, or <strong>REVOKE</strong> to any message. Once you opt out, you will no longer receive SMS from CallRecover unless you initiate a new service request and complete the double opt-in again.
          </p>
        </Section>

        <Section title="5. Help Instructions">
          <p>
            For assistance, reply <strong>HELP</strong> or <strong>INFO</strong> to any message, or contact us directly:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Email: David@callrecover.net</li>
            <li>Phone: (878) 234-0176</li>
            <li>Business: Classroom Panda LLC dba CallRecover</li>
          </ul>
        </Section>

        <Section title="6. Consent">
          <p>
            Consent is captured through a two-layer (double) opt-in: (1) verbal yes/no recorded on the call with our AI voice agent after a clear disclosure of message frequency, rates, and STOP instructions; and (2) a <strong>YES</strong> reply to the single confirmation text sent to mobile numbers. Both layers are required before any further SMS is sent. If verbal consent is declined or the caller is on a landline, no SMS is attempted. Consent is not required as a condition of purchasing any goods or services. Opt-in keywords accepted on inbound SMS: <strong>YES, START, JOIN, BEGIN, CONFIRM, UNSTOP</strong>.
          </p>
        </Section>

        <Section title="7. No Marketing Messages">
          <p>
            CallRecover does not send promotional, advertising, or marketing SMS. All messages are transactional and directly related to a service request you initiated.
          </p>
        </Section>

        <Section title="8. Privacy Policy">
          <p>
            Your personal information is handled in accordance with our{" "}
            <a href="https://callrecover.net/privacy-policy" className="underline text-primary" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            . We do not share your mobile number with third parties for marketing purposes.
          </p>
        </Section>

        <Section title="9. Changes to Terms">
          <p>
            We may update these terms from time to time. Continued use of our services after changes constitutes acceptance of the updated terms.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about these terms? Contact us at David@callrecover.net or (878) 234-0176.
          </p>
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
