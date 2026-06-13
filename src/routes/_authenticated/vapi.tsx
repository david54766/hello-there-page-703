import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listVapiPhoneNumbers,
  createVapiCall,
  listVapiCalls,
  getVapiCall,
  listNumberAssistants,
  ensureAssistantForNumber,
  updateAssistantForNumber,
} from "@/lib/vapi.functions";
import { listScriptTemplates } from "@/lib/scripts.functions";
import { getBusinessForTags } from "@/lib/schedule.functions";
import { mergeTagDefaults, applyTags, TAG_DEFS, type TagValues } from "@/lib/tags";
import { TagPicker } from "@/components/tag-picker";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Phone, Loader2, RefreshCw, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CONTRACTOR_TYPES, DEFAULT_AGENT_NAME } from "@/lib/contractor-data";

export const Route = createFileRoute("/_authenticated/vapi")({ component: VapiPage });

const E164 = /^\+[1-9]\d{4,14}$/;

function validateE164(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Enter a phone number.";
  if (!v.startsWith("+")) return "Must start with + and country code, e.g. +1 for US.";
  if (/[^\d+\s\-().]/.test(v)) return "Only digits, spaces, dashes, parens allowed after the +.";
  const compact = "+" + v.slice(1).replace(/\D/g, "");
  if (compact.length < 8) return "Too short - include country code + full number.";
  if (compact.length > 16) return "Too long - max 15 digits after the +.";
  if (!E164.test(compact)) return "Invalid E.164 format. Example: +15551234567";
  return null;
}

function normalizeE164(raw: string): string {
  return "+" + raw.trim().slice(1).replace(/\D/g, "");
}

function contractorLabel(value?: string | null) {
  if (!value) return "Any Trade";
  return CONTRACTOR_TYPES.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
  const fetchNumbers = useServerFn(listVapiPhoneNumbers);
  const startCall = useServerFn(createVapiCall);
  const fetchCalls = useServerFn(listVapiCalls);
  const fetchCall = useServerFn(getVapiCall);
  const fetchNumberAssistants = useServerFn(listNumberAssistants);
  const ensureAssistant = useServerFn(ensureAssistantForNumber);
  const updateAssistant = useServerFn(updateAssistantForNumber);
  const fetchTemplates = useServerFn(listScriptTemplates);
  const fetchBusiness = useServerFn(getBusinessForTags);

  const [numbers, setNumbers] = useState<{ id: string; number: string; name: string }[]>([]);
  const [customer, setCustomer] = useState("");
  const [customerTouched, setCustomerTouched] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, { loading: boolean; transcript?: string | null; recordingUrl?: string | null }>>({});
  const [business, setBusiness] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [numberRows, setNumberRows] = useState<any[]>([]);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  const phoneError = useMemo(() => (customerTouched ? validateE164(customer) : null), [customer, customerTouched]);
  const tags: TagValues = useMemo(
    () => mergeTagDefaults(business, customerName ? { name: customerName } : {}),
    [business, customerName],
  );
  const promptPreview = useMemo(() => applyTags(systemPrompt, tags), [systemPrompt, tags]);
  const firstPreview = useMemo(() => applyTags(firstMessage, tags), [firstMessage, tags]);
  const accountNumber = numbers[0] ?? null;
  const accountAssistant = numberRows[0] ?? null;

  useEffect(() => {
    Promise.all([
      fetchNumbers(),
      fetchNumberAssistants(),
      fetchTemplates({ data: {} }),
      fetchBusiness(),
    ])
      .then(([n, rows, t, biz]) => {
        setNumbers(n.numbers);
        setNumberRows(rows.rows);
        setTemplates(t.templates);
        setBusiness(biz.business);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provisionMissing = async (phoneNumberId: string, phoneNumber: string) => {
    try {
      await ensureAssistant({ data: { phoneNumberId, phoneNumber, contractorType: business?.contractor_type } });
      const fresh = await fetchNumberAssistants();
      setNumberRows(fresh.rows);
      toast.success("Assistant provisioned");
    } catch (e: any) { toast.error(e.message); }
  };

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
    if (!accountAssistant?.assistant_id) { toast.error("Provision the account assistant first."); return; }
    const err = validateE164(customer);
    if (err) { toast.error(err); return; }
    setCalling(true);
    try {
      await startCall({
        data: {
          customerNumber: normalizeE164(customer),
          systemPrompt: systemPrompt || undefined,
          firstMessage: firstMessage || undefined,
          tagOverrides: customerName ? { name: customerName } : undefined,
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

  const loadTemplateInto = (kind: "first_message" | "system", id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if (kind === "first_message") setFirstMessage(t.body);
    else setSystemPrompt(t.body);
    toast.success(`Loaded "${t.label}"`);
  };

  const filteredTemplates = (kind: string) => {
    const currentType = business?.contractor_type;
    const matched = templates.filter(
      (t) =>
        t.kind === kind &&
        (!currentType ||
          !t.contractor_type ||
          t.contractor_type === currentType),
    );
    return matched.length ? matched : templates.filter((t) => t.kind === kind);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">Vapi Outbound Test Call</h1>
      <p className="mb-6 text-sm text-muted-foreground">Trigger a real phone call, manage the one assistant assigned to this account's Vapi number, and review transcripts. Use <code className="rounded bg-muted px-1 text-xs">{"{tags}"}</code> in scripts - they're filled from your business profile at call time.</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading Vapi resources...</p>
      ) : (
        <Tabs defaultValue="call">
          <TabsList className="mb-4">
            <TabsTrigger value="call">Place Call</TabsTrigger>
            <TabsTrigger value="numbers">Account Assistant</TabsTrigger>
            <TabsTrigger value="recent">Recent Calls</TabsTrigger>
          </TabsList>

          <TabsContent value="call">
        <Card className="space-y-4 p-5">
          <div className="rounded-lg border bg-muted/30 p-4">
            <Label>Account assistant</Label>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{accountNumber?.number ?? accountAssistant?.phone_number ?? "No Vapi number assigned"}</div>
                <div className="text-xs text-muted-foreground">
                  {accountAssistant?.assistant_name ?? "One assistant answers for this account"}
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${accountAssistant?.assistant_id ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {accountAssistant?.assistant_id ? "Connected" : "Pending"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              CallRecover uses this assigned assistant automatically; users cannot switch to another assistant for this account.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cust-name">Customer name (optional)</Label>
              <Input
                id="cust-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Jane Doe"
                maxLength={120}
              />
              <p className="mt-1 text-xs text-muted-foreground">Substitutes <code>{"{name}"}</code> in scripts.</p>
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
                <p className="mt-1 text-xs text-muted-foreground">Include + and country code. e.g. +15551234567</p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <Label htmlFor="first">First message (optional)</Label>
              <div className="flex items-center gap-2">
                {filteredTemplates("first_message").length > 0 && (
                  <Select onValueChange={(v) => loadTemplateInto("first_message", v)}>
                    <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="Load template" /></SelectTrigger>
                    <SelectContent>
                      {filteredTemplates("first_message").map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.label} - {contractorLabel(t.contractor_type)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <TagPicker value={firstMessage} onChange={setFirstMessage} textareaRef={firstRef} />
              </div>
            </div>
            <Input
              id="first"
              ref={firstRef as any}
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder="Hi {name}, this is calling from {business} - do you have a moment?"
              maxLength={2000}
            />
            {firstMessage && firstPreview !== firstMessage && (
              <p className="mt-1 text-xs text-muted-foreground"><Sparkles className="mr-1 inline h-3 w-3" />{firstPreview}</p>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <Label htmlFor="script">Script / system prompt (optional)</Label>
              <div className="flex items-center gap-2">
                {filteredTemplates("system").length > 0 && (
                  <Select onValueChange={(v) => loadTemplateInto("system", v)}>
                    <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="Load template" /></SelectTrigger>
                    <SelectContent>
                      {filteredTemplates("system").map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.label} - {contractorLabel(t.contractor_type)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <TagPicker value={systemPrompt} onChange={setSystemPrompt} textareaRef={promptRef} />
              </div>
            </div>
            <Textarea
              id="script"
              ref={promptRef}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={"You are a virtual assistant for {business}. Collect the caller's name, callback number, and reason for calling. Only offer scheduling when scheduling is enabled and a booking link exists."}
              rows={6}
              maxLength={8000}
            />
            <p className="mt-1 text-xs text-muted-foreground">Overrides the assistant's default instructions for this call only. Use <code>{"{business}"}</code>, <code>{"{website}"}</code>, etc. - manage values in Settings.</p>
          </div>

          <details className="rounded-md border border-border bg-muted/20 p-3 text-xs">
            <summary className="cursor-pointer text-muted-foreground">Tag values for this call</summary>
            <dl className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {TAG_DEFS.map((t) => (
                <div key={t.key} className="flex justify-between gap-2">
                  <dt className="font-mono text-muted-foreground">{t.label}</dt>
                  <dd className="truncate text-right">{tags[t.key] ?? <span className="text-muted-foreground">-</span>}</dd>
                </div>
              ))}
            </dl>
          </details>

          <Button onClick={placeCall} disabled={calling} className="w-full sm:w-auto">
            {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />} Place Call
          </Button>
        </Card>
          </TabsContent>

          <TabsContent value="numbers">
            <NumbersTab
              numbers={numbers}
              rows={numberRows}
              onProvision={provisionMissing}
              onUpdate={async (phoneNumberId, payload) => {
                try {
                  await updateAssistant({ data: { phoneNumberId, ...payload } });
                  const fresh = await fetchNumberAssistants();
                  setNumberRows(fresh.rows);
                  toast.success("Saved");
                } catch (e: any) { toast.error(e.message); }
              }}
            />
          </TabsContent>

          <TabsContent value="recent">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Recent Calls</h2>
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
                      {c.status && <> - {c.status}</>}
                      {c.endedReason && <> - {c.endedReason}</>}
                      {c.durationSeconds != null && <> - {c.durationSeconds}s</>}
                    </div>
                  </div>
                  {ex ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                </button>
                {ex && (
                  <div className="mt-3 rounded-md bg-muted/40 p-3 text-xs">
                    {ex.loading ? (
                      <span className="text-muted-foreground">Loading transcript...</span>
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
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function NumbersTab({
  numbers,
  rows,
  onUpdate,
  onProvision,
}: {
  numbers: { id: string; number: string; name: string }[];
  rows: any[];
  onUpdate: (phoneNumberId: string, payload: { assistantName?: string; systemPrompt?: string; firstMessage?: string; contractorType?: string }) => Promise<void>;
  onProvision: (phoneNumberId: string, phoneNumber: string) => Promise<void>;
}) {
  const byId = new Map(rows.map((r) => [r.phone_number_id, r]));
  return (
    <div className="space-y-4">
      {numbers.length === 0 && (
        <Card className="p-4 text-sm text-muted-foreground">No Vapi numbers configured yet.</Card>
      )}
      {numbers.map((n) => {
        const row = byId.get(n.id);
        if (!row) {
          return (
            <Card key={n.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-semibold">{n.number}</div>
                <div className="text-xs text-muted-foreground">No assistant yet.</div>
              </div>
              <Button size="sm" onClick={() => onProvision(n.id, n.number)}>Provision assistant</Button>
            </Card>
          );
        }
        return <NumberRow key={n.id} number={n} row={row} onSave={(p) => onUpdate(n.id, p)} />;
      })}
    </div>
  );
}

function NumberRow({ number, row, onSave }: { number: { id: string; number: string; name: string }; row: any; onSave: (p: any) => Promise<void> }) {
  const [name, setName] = useState(row?.assistant_name ?? "");
  const [first, setFirst] = useState(row?.custom_first_message ?? "");
  const [prompt, setPrompt] = useState(row?.custom_prompt ?? "");
  const [type, setType] = useState(row?.contractor_type_preset ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setName(row?.assistant_name ?? "");
    setFirst(row?.custom_first_message ?? "");
    setPrompt(row?.custom_prompt ?? "");
    setType(row?.contractor_type_preset ?? "");
  }, [row]);
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{number.number}</div>
          <div className="text-xs text-muted-foreground">
            {row?.assistant_id ? `Assistant: ${row.assistant_id.slice(0, 8)}...` : "Provisioning..."}
          </div>
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44 text-xs"><SelectValue placeholder="Contractor type" /></SelectTrigger>
          <SelectContent>
            {CONTRACTOR_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Agent name callers hear</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder={DEFAULT_AGENT_NAME}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Used in the opening line, for example: "My name is {name || DEFAULT_AGENT_NAME}."
        </p>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <Label className="text-xs">First message</Label>
          <TagPicker value={first} onChange={setFirst} />
        </div>
        <Input value={first} onChange={(e) => setFirst(e.target.value)} maxLength={2000} />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <Label className="text-xs">System prompt</Label>
          <TagPicker value={prompt} onChange={setPrompt} />
        </div>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} maxLength={8000} />
      </div>
      <Button
        size="sm"
        disabled={saving || !row?.assistant_id}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave({ assistantName: name, firstMessage: first, systemPrompt: prompt, contractorType: type || undefined });
          } finally { setSaving(false); }
        }}
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Save changes
      </Button>
    </Card>
  );
}
