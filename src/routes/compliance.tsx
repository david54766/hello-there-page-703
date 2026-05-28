import { createFileRoute, Link } from "@tanstack/react-router";
import { SmsComplianceCard, CampaignRegistrationCard } from "@/components/sms-compliance";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/compliance")({
  component: CompliancePage,
  head: () => ({
    meta: [
      { title: "SMS & Voice Compliance · CallRecover AI" },
      { name: "description", content: "How CallRecover AI handles SMS consent, opt-outs, A2P 10DLC, and AI voice disclosures via Twilio." },
    ],
  }),
});

function CompliancePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4" /> Back</Link>
      </Button>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">SMS &amp; Voice Compliance</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        CallRecover AI uses Twilio for SMS and voice. The disclosures below apply
        to every message and call the platform sends on your behalf.
      </p>
      <div className="space-y-6">
        <SmsComplianceCard />
        <CampaignRegistrationCard />
      </div>
    </div>
  );
}