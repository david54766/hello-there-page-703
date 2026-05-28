import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "callrecover.cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // ignore (SSR / privacy mode)
    }
  }, []);

  function decide(value: "accepted" | "declined") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 p-4 shadow-[var(--shadow-elevated)] backdrop-blur sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Cookie className="h-4 w-4" />
          </span>
          <p className="text-sm text-muted-foreground">
            We use cookies to keep you signed in and to understand how CallRecover is used.
            See our{" "}
            <Link to="/cookies" className="underline hover:text-foreground">Cookie Policy</Link>{" "}
            and{" "}
            <Link to="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:justify-end">
          <Button variant="ghost" size="sm" onClick={() => decide("declined")}>
            Decline
          </Button>
          <Button size="sm" onClick={() => decide("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}