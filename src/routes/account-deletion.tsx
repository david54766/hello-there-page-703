import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/account-deletion")({
  component: AccountDeletionPage,
  head: () => ({
    meta: [
      { title: "Account Deletion - CallRecover" },
      {
        name: "description",
        content:
          "How CallRecover users can request account and data deletion.",
      },
    ],
  }),
});

function AccountDeletionPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </Button>

      <div className="mb-6 flex items-center gap-2">
        <Trash2 className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">
          Account deletion
        </h1>
      </div>

      <Card className="space-y-6 p-6">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Request deletion</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            CallRecover users can request deletion of their account and business
            workspace by emailing{" "}
            <a className="underline text-primary" href="mailto:David@callrecover.net">
              David@callrecover.net
            </a>{" "}
            from the email address used to sign in.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">What is deleted</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Account deletion removes the business workspace, team routing
            records, app session records, call transcripts, SMS history,
            scheduling records, and recordings associated with the account,
            except where retention is required for legal, fraud prevention,
            payment, security, or compliance reasons.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Processing time</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We verify the request and process deletion as quickly as possible.
            If more information is needed to confirm account ownership, we will
            reply to the account email before deleting data.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href="mailto:David@callrecover.net?subject=CallRecover%20account%20deletion%20request">
              Request account deletion
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/privacy-policy">Read privacy policy</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
