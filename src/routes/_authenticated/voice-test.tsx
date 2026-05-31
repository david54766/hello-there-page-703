import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/voice-test")({ component: VoiceTest });

const VoiceTestInner = lazy(() => import("@/components/voice-test-inner"));

function VoiceTest() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">Voice agent · live test</h1>
      <p className="mb-6 text-sm text-muted-foreground">Talk to your AI receptionist from the browser. Once your Twilio voice number is approved, real callers hit this same agent.</p>
      {mounted ? (
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading voice agent…</p>}>
          <VoiceTestInner />
        </Suspense>
      ) : (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
    </div>
  );
}