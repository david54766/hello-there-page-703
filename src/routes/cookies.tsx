import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Cookie } from "lucide-react";

export const Route = createFileRoute("/cookies")({
  component: CookiePolicyPage,
  head: () => ({
    meta: [
      { title: "Cookie Policy · CallRecover" },
      { name: "description", content: "CallRecover cookie policy explaining what cookies we use and how you can manage them." },
    ],
  }),
});

function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4" /> Back</Link>
      </Button>
      <div className="mb-6 flex items-center gap-2">
        <Cookie className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">Cookie Policy</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Effective date: May 27, 2026 · CallRecover
      </p>

      <Card className="space-y-6 p-6">
        <Section title="1. What are cookies">
          <p>
            Cookies are small text files that are stored on your device when you visit a website. They help the site remember your preferences, improve performance, and provide a better user experience.
          </p>
        </Section>

        <Section title="2. How we use cookies">
          <p>CallRecover uses cookies for the following purposes:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Essential cookies:</strong> Required for the website to function properly, such as maintaining your session and authentication state.</li>
            <li><strong>Functional cookies:</strong> Remember your preferences and settings to enhance your experience.</li>
            <li><strong>Analytics cookies:</strong> Help us understand how visitors interact with our website so we can improve it.</li>
          </ul>
        </Section>

        <Section title="3. Types of cookies we use">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Session cookies:</strong> Temporary cookies that expire when you close your browser.</li>
            <li><strong>Persistent cookies:</strong> Remain on your device for a set period to remember your preferences on future visits.</li>
            <li><strong>First-party cookies:</strong> Set by CallRecover directly.</li>
            <li><strong>Third-party cookies:</strong> Set by trusted partners such as analytics providers.</li>
          </ul>
        </Section>

        <Section title="4. Managing your cookie preferences">
          <p>
            You can control and manage cookies in your browser settings. Most browsers allow you to block or delete cookies. Please note that disabling certain cookies may affect the functionality of our website.
          </p>
        </Section>

        <Section title="5. Third-party services">
          <p>
            We may use third-party services (such as analytics providers) that place cookies on your device. These services have their own privacy and cookie policies.
          </p>
        </Section>

        <Section title="6. Changes to this policy">
          <p>
            We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated effective date.
          </p>
        </Section>

        <Section title="7. Contact us">
          <p>
            If you have any questions about our Cookie Policy, please contact us at David@callrecover.net or (878) 234-0176.
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
