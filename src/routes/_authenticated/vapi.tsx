import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listVapiAssistants,
  listVapiPhoneNumbers,
  createVapiCall,
  listVapiCalls,
  getVapiCall,
} from "@/lib/vapi.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Loader2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/vapi")({ component: VapiPage });

const E164 = /^\+[1-9]\d{4,14}$/;

function validateE164(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Enter a phone number.";
  if (!v.startsWith("+")) return "Must start with + and country code, e.g. +1 for US.";
  if (/[^\d+\s\-().]/.test(v)) return "Only digits, spaces, dashes, parens allowed after the +.";
  const compact = "+" + v.slice(1).replace(/\D/g, "");
  if (compact.length < 8) return "Too short — include country code + full number.";
  if (compact.length > 16) return "Too long — max 15 digits after the +.";
  if (!E164.test(compact)) return "Invalid E.164 format. Example: +15551234567";
  return null;
}

function normalizeE164(raw: string): string {
  return "+" + raw.trim().slice(1).replace(/\D/g, "");
}

type CallRow = {
  id: string;
  createdAt?: string;
  status?: string;
  endedReason?: string | null;
  customerNumber?: string | null;
  durationSeconds?: number | null;
  transcript?: string | null;
};

function VapiPage() {
  const fetchAssistants = useServerFn(listVapiAssistants);
  const fetchNumbers = useServerFn(listVapiPhoneNumbers);
  const startCall = useServerFn(createVapiCall);
  const fetchCalls = useServerFn(listVapiCalls);
  const fetchCall = useServerFn(getVapiCall);

  const [assistants, setAssistants] = useState<{ id: string; name: string }[]>([]);
  const [numbers, setNumbers] = useState<{ id: string; number: string; name: string }[]>([]);
  const [assistantId, setAssistantId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [customer, setCustomer] = useState("");
  const [customerTouched, setCustomerTouched] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, { loading: boolean; transcript?: string | null; recordingUrl?: string | null }>>({});

  const phoneError = useMemo(() => (customerTouched ? validateE164(customer) : null), [customer, customerTouched]);

  useEffect(() => {
    Promise.all([fetchAssistants(), fetchNumbers()])
      .then(([a, n]) => { setAssistants(a.assistants); setNumbers(n.numbers); })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [fetchAssistants, fetchNumbers]);

  const loadCalls = async () => {
    setCallsLoading(true);
    try {
      const { calls } = await fetchCalls();
      setCalls(calls);
    } catch (e: any) { toast.error(e.message); }
    finally { setCallsLoading(false); }
  };

  useEffect(() => { loadCalls(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const placeCall = async () => {
    setCustomerTouched(true);
    if (!assistantId || !phoneNumberId) { toast.error("Pick an assistant and a from number."); return; }
    const err = validateE164(customer);
    if (err) { toast.error(err); return; }
    setCalling(true);
    try {
      await startCall({
        data: {
          assistantId,
          phoneNumberId,
          customerNumber: normalizeE164(customer),
          systemPrompt: systemPrompt || undefined,
          firstMessage: firstMessage || undefined,
        },
      });
      toast.success("Call initiated");
      setTimeout(loadCalls, 1500);
    } catch (e: any) { toast.error(e.message); }
    finally { setCalling(false); }
  };

  const toggleCall = async (id: string) => {
    const current = expanded[id];
    if (current) {
      setExpanded(({ [id]: _, ...rest }) => rest);
      return;
    }
    setExpanded((p) => ({ ...p, [id]: { loading: true } }));
    try {
      const { call } = await fetchCall({ data: { id } });
      setExpanded((p) => ({ ...p, [id]: { loading: false, transcript: call.transcript, recordingUrl: call.recordingUrl } }));
    } catch (e: any) {
      toast.error(e.message);
      setExpanded(({ [id]: _, ...rest }) => rest);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">Vapi · outbound test call</h1>
      <p className="mb-6 text-sm text-muted-foreground">Trigger a real phone call from your Vapi number to any destination. Optional script overrides the assistant's system prompt and opening line for this call only.</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading Vapi resources…</p>
      ) : (
        <>
        <Card className="space-y-4 p-5">
          <div>
            <Label>Assistant</Label>
            <Select value={assistantId} onValueChange={setAssistantId}>
              <SelectTrigger><SelectValue placeholder={assistants.length ? "Pick an assistant" : "No assistants found"} /></SelectTrigger>
              <SelectContent>
                {assistants.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>From (your Vapi number)</Label>
            <Select value={phoneNumberId} onValueChange={setPhoneNumberId}>
              <SelectTrigger><SelectValue placeholder={numbers.length ? "Pick a number" : "No numbers configured in Vapi"} /></SelectTrigger>
              <SelectContent>
                {numbers.map((n) => <SelectItem key={n.id} value={n.id}>{n.number} {n.name && `· ${n.name}`}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dest">Destination number (E.164)</Label>
            <Input
              id="dest"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              onBlur={() => setCustomerTouched(true)}
              placeholder="+15551234567"
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={!!phoneError}
              className={phoneError ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {phoneError ? (
              <p className="mt-1 text-xs text-destructive">{phoneError}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Include country code with +. Example: +1 555 123 4567 → +15551234567</p>
            )}
          </div>

          <div>
            <Label htmlFor="first">First message (optional)</Label>
            <Input
              id="first"
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder="Hi, this is Sam calling from Acme — do you have a moment?"
              maxLength={2000}
            />
          </div>

          <div>
            <Label htmlFor="script">Script / system prompt (optional)</Label>
            <Textarea
              id="script"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={"You are a friendly scheduling agent. Confirm the appointment, answer questions about pricing, and offer to transfer to a human if asked."}
              rows={6}
              maxLength={8000}
            />
            <p className="mt-1 text-xs text-muted-foreground">Overrides the assistant's default instructions for this call only. Leave blank to use the assistant as-is.</p>
          </div>

          <Button onClick={placeCall} disabled={calling} className="w-full sm:w-auto">
            {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />} Place call
          </Button>
        </Card>

        <div className="mt-8 mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent calls</h2>
          <Button variant="outline" size="sm" onClick={loadCalls} disabled={callsLoading}>
            {callsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
          </Button>
        </div>
        <Card className="divide-y p-0">
          {calls.length === 0 && !callsLoading && (
            <p className="p-4 text-sm text-muted-foreground">No calls yet.</p>
          )}
          {calls.map((c) => {
            const ex = expanded[c.id];
            return (
              <div key={c.id} className="p-4">
                <button
                  type="button"
                  onClick={() => toggleCall(c.id)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.customerNumber ?? "(unknown)"}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                      {c.status && <> · {c.status}</>}
                      {c.endedReason && <> · {c.endedReason}</>}
                      {c.durationSeconds != null && <> · {c.durationSeconds}s</>}
                    </div>
                  </div>
                  {ex ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                </button>
                {ex && (
                  <div className="mt-3 rounded-md bg-muted/40 p-3 text-xs">
                    {ex.loading ? (
                      <span className="text-muted-foreground">Loading transcript…</span>
                    ) : ex.transcript ? (
                      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{ex.transcript}</pre>
                    ) : (
                      <span className="text-muted-foreground">No transcript available yet.</span>
                    )}
                    {ex.recordingUrl && (
                      <audio controls src={ex.recordingUrl} className="mt-3 w-full" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
        </>
      )}
    </div>
  );
}