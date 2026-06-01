import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listVapiPhoneNumbers, listNumberAssistants, ensureAssistantForNumber, updateAssistantForNumber, previewVoice } from "@/lib/vapi.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONTRACTOR_TYPES, CARRIERS, getForwardingInstructions, getStandardScript, type Carrier, type ContractorType } from "@/lib/contractor-data";
import { VOICE_OPTIONS, DEFAULT_VOICE_ID } from "@/lib/voices";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Check, Copy, PhoneCall, ShieldCheck, Sparkles, Loader2, Play, Mic2, CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

type State = {
  business_name: string;
  contractor_type: ContractorType | "";
  business_phone: string;
  owner_phone: string;
  carrier: Carrier | "";
};

function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [bizId, setBizId] = useState<string | null>(null);
  const [twilioNumber, setTwilioNumber] = useState<string>("+15555550123");
  const [testDone, setTestDone] = useState(false);
  const [state, setState] = useState<State>({
    business_name: "", contractor_type: "", business_phone: "", owner_phone: "", carrier: "",
  });
  const fetchNumbers = useServerFn(listVapiPhoneNumbers);
  const fetchNumberAssistants = useServerFn(listNumberAssistants);
  const ensureAssistant = useServerFn(ensureAssistantForNumber);
  const updateAssistant = useServerFn(updateAssistantForNumber);
  const previewVoiceFn = useServerFn(previewVoice);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentRows, setAgentRows] = useState<{ number: string; assistantId: string | null; phoneNumberId: string }[]>([]);
  const [agentRan, setAgentRan] = useState(false);

  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const [voicePlayed, setVoicePlayed] = useState<Set<string>>(new Set());
  const [voicePlaying, setVoicePlaying] = useState<string | null>(null);
  const [voiceSaving, setVoiceSaving] = useState(false);

  const [schedulingEnabled, setSchedulingEnabled] = useState(false);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [scriptFirst, setScriptFirst] = useState("");
  const [scriptSystem, setScriptSystem] = useState("");
  const [scriptSaving, setScriptSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    supabase.from("businesses").select("*").eq("owner_id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setBizId(data.id);
      setTwilioNumber(data.twilio_number ?? "+15555550123");
      setState({
        business_name: data.business_name ?? "",
        contractor_type: (data.contractor_type ?? "") as ContractorType | "",
        business_phone: data.business_phone ?? "",
        owner_phone: data.owner_phone ?? "",
        carrier: (data.carrier ?? "") as Carrier | "",
      });
      if ((data as any).agent_voice_id) setVoiceId((data as any).agent_voice_id);
      setSchedulingEnabled(!!(data as any).scheduling_enabled);
      setBookingUrl(
        ((data as any).booking_url as string | null) ||
        ((data as any).cal_url as string | null) ||
        ((data as any).calendly_url as string | null) ||
        null,
      );
      if (data.onboarding_complete) navigate({ to: "/dashboard" });
    });
  }, [user, authLoading, navigate]);

  const steps = ["Business", "Type", "Business phone", "Your cell", "Carrier", "AI agent", "Voice", "Script", "Forwarding", "Test"];
  const totalSteps = steps.length;

  async function next() {
    if (!bizId) return;
    // Persist progress on each step
    const patch: TablesUpdate<"businesses"> = {};
    if (step === 0) patch.business_name = state.business_name;
    if (step === 1) patch.contractor_type = state.contractor_type || null;
    if (step === 2) patch.business_phone = state.business_phone;
    if (step === 3) patch.owner_phone = state.owner_phone;
    if (step === 4) patch.carrier = state.carrier || null;
    if (Object.keys(patch).length) {
      const { error } = await supabase.from("businesses").update(patch).eq("id", bizId);
      if (error) return toast.error(error.message);
    }
    setStep((s) => Math.min(s + 1, totalSteps));
  }

  async function finish() {
    if (!bizId) return;
    await supabase.from("businesses").update({ onboarding_complete: true }).eq("id", bizId);
    navigate({ to: "/dashboard" });
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  const provisionedNumber = agentRows.find((r) => r.assistantId)?.number ?? agentRows[0]?.number ?? twilioNumber;
  const fwd = state.carrier ? getForwardingInstructions(state.carrier as Carrier, provisionedNumber) : null;

  // Provision Vapi assistants when entering the AI agent step
  useEffect(() => {
    if (step !== 5 || agentRan || agentLoading) return;
    setAgentLoading(true);
    (async () => {
      try {
        const [{ numbers }, { rows }] = await Promise.all([fetchNumbers(), fetchNumberAssistants()]);
        const provisioned = new Set(rows.map((r: any) => r.phone_number_id));
        const missing = numbers.filter((n) => !provisioned.has(n.id));
        await Promise.allSettled(
          missing.map((n) =>
            ensureAssistant({ data: { phoneNumberId: n.id, phoneNumber: n.number, contractorType: state.contractor_type || undefined } }),
          ),
        );
        const fresh = await fetchNumberAssistants();
        const map = new Map(fresh.rows.map((r: any) => [r.phone_number_id, r]));
        setAgentRows(numbers.map((n) => ({ number: n.number, phoneNumberId: n.id, assistantId: (map.get(n.id) as any)?.assistant_id ?? null })));
      } catch (e: any) {
        toast.error(e?.message ?? "Could not provision AI agent");
      } finally {
        setAgentLoading(false);
        setAgentRan(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Build the trade-tailored script the moment the user lands on the Script step.
  useEffect(() => {
    if (step !== 7) return;
    if (scriptFirst && scriptSystem) return;
    const tpl = getStandardScript(state.contractor_type || null, state.business_name, {
      schedulingEnabled,
      bookingUrl,
    });
    setScriptFirst(tpl.firstMessage);
    setScriptSystem(tpl.systemPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function playVoicePreview(id: string) {
    if (voicePlaying) return;
    setVoicePlaying(id);
    try {
      const { audioBase64, mime } = await previewVoiceFn({
        data: {
          voiceId: id,
          text: `Thanks for calling ${state.business_name || "our team"}. All of our team are on another line right now — but I can take your details and pass them along immediately.`,
        },
      });
      const audio = new Audio(`data:${mime};base64,${audioBase64}`);
      audio.onended = () => setVoicePlaying(null);
      audio.onerror = () => setVoicePlaying(null);
      await audio.play();
      setVoicePlayed((s) => new Set(s).add(id));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not play preview");
      setVoicePlaying(null);
    }
  }

  async function saveVoiceAndContinue() {
    if (!bizId) return;
    setVoiceSaving(true);
    try {
      await supabase.from("businesses").update({ agent_voice_id: voiceId }).eq("id", bizId);
      await Promise.allSettled(
        agentRows
          .filter((r) => r.assistantId)
          .map((r) => updateAssistant({ data: { phoneNumberId: r.phoneNumberId, voiceId } })),
      );
      setStep(7);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save voice");
    } finally {
      setVoiceSaving(false);
    }
  }

  async function saveScriptAndContinue() {
    setScriptSaving(true);
    try {
      await Promise.allSettled(
        agentRows
          .filter((r) => r.assistantId)
          .map((r) =>
            updateAssistant({
              data: {
                phoneNumberId: r.phoneNumberId,
                firstMessage: scriptFirst,
                systemPrompt: scriptSystem,
                contractorType: state.contractor_type || undefined,
              },
            }),
          ),
      );
      setStep(8);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save script");
    } finally {
      setScriptSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-subtle)] p-6">
      <div className="w-full max-w-xl">
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {Math.min(step + 1, totalSteps)} of {totalSteps}</span>
          <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
        </div>
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-[image:var(--gradient-primary)]"
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <Card className="p-8 shadow-[var(--shadow-card)]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <Field label="What's your business called?" desc="This is how callers will see you in texts.">
                  <Input autoFocus value={state.business_name} onChange={(e) => setState({ ...state, business_name: e.target.value })} placeholder="Apex Roofing" />
                </Field>
              )}
              {step === 1 && (
                <Field label="What kind of contractor are you?" desc="We tailor SMS templates to your trade.">
                  <Select value={state.contractor_type} onValueChange={(v) => setState({ ...state, contractor_type: v as ContractorType })}>
                    <SelectTrigger><SelectValue placeholder="Select a trade" /></SelectTrigger>
                    <SelectContent>
                      {CONTRACTOR_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {step === 2 && (
                <Field label="Your business phone number" desc="The number customers currently call.">
                  <Input type="tel" value={state.business_phone} onChange={(e) => setState({ ...state, business_phone: e.target.value })} placeholder="+1 555 123 4567" />
                </Field>
              )}
              {step === 3 && (
                <Field label="Your cell phone" desc="Where calls ring first before voicemail kicks in.">
                  <Input type="tel" value={state.owner_phone} onChange={(e) => setState({ ...state, owner_phone: e.target.value })} placeholder="+1 555 987 6543" />
                </Field>
              )}
              {step === 4 && (
                <Field label="Who's your carrier?" desc="So we can show you the right forwarding code.">
                  <Select value={state.carrier} onValueChange={(v) => setState({ ...state, carrier: v as Carrier })}>
                    <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {step === 5 && (
                <AgentStep loading={agentLoading} rows={agentRows} />
              )}
              {step === 6 && (
                <VoiceStep
                  voiceId={voiceId}
                  setVoiceId={setVoiceId}
                  played={voicePlayed}
                  playing={voicePlaying}
                  onPreview={playVoicePreview}
                />
              )}
              {step === 7 && (
                <ScriptStep
                  first={scriptFirst}
                  setFirst={setScriptFirst}
                  system={scriptSystem}
                  schedulingEnabled={schedulingEnabled}
                  hasBooking={!!bookingUrl}
                />
              )}
              {step === 8 && fwd && (
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{fwd.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Set up forwarding so we can catch missed calls.</p>
                  <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
                    <code className="flex-1 font-mono text-sm">{fwd.dialCode}</code>
                    <Button variant="outline" size="sm" onClick={() => copy(fwd.dialCode)}><Copy className="h-3 w-3" /> Copy</Button>
                  </div>
                  <ol className="mt-5 space-y-2 text-sm">
                    {fwd.steps.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{i + 1}</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-5 text-xs text-muted-foreground">Your CallRecover number: <span className="font-mono">{provisionedNumber}</span></p>
                </div>
              )}
              {step === 9 && (
                <div className="text-center">
                  {!testDone ? (
                    <>
                      <PhoneCall className="mx-auto h-12 w-12 text-primary" />
                      <h2 className="mt-4 text-xl font-semibold">Test your setup</h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Call your business number from another phone, don't answer, and let it ring out.
                      </p>
                      <Button className="mt-6" onClick={() => { setTestDone(true); toast.success("Test detected!"); }}>
                        I called — verify
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                        <ShieldCheck className="h-7 w-7" />
                      </div>
                      <h2 className="mt-4 text-2xl font-semibold tracking-tight">Your missed calls are now protected.</h2>
                      <p className="mt-2 text-sm text-muted-foreground">CallRecover is live. Every missed call will land in your dashboard.</p>
                      <Button className="mt-6" onClick={finish}>Go to dashboard</Button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {step < 5 && (
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
              <Button onClick={next} disabled={
                (step === 0 && !state.business_name.trim()) ||
                (step === 1 && !state.contractor_type) ||
                (step === 2 && !state.business_phone.trim()) ||
                (step === 3 && !state.owner_phone.trim()) ||
                (step === 4 && !state.carrier)
              }>Continue</Button>
            </div>
          )}
          {step === 5 && (
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button>
              <Button onClick={() => setStep(6)} disabled={agentLoading}>
                {agentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Continue
              </Button>
            </div>
          )}
          {step === 6 && (
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button>
              <Button
                onClick={saveVoiceAndContinue}
                disabled={voiceSaving || !voicePlayed.has(voiceId)}
              >
                {voiceSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve voice
              </Button>
            </div>
          )}
          {step === 7 && (
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button>
              <Button onClick={saveScriptAndContinue} disabled={scriptSaving || !scriptFirst.trim()}>
                {scriptSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve script
              </Button>
            </div>
          )}
          {step === 8 && (
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button>
              <Button onClick={() => setStep(9)}><Check className="h-4 w-4" /> I set it up</Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

function Field({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xl font-semibold tracking-tight">{label}</Label>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function AgentStep({ loading, rows }: { loading: boolean; rows: { number: string; assistantId: string | null }[] }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">Your AI agent</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        We're assigning a Vapi assistant to your number with trade-aware defaults. You can customize the name, greeting, and script anytime from the <span className="font-medium">AI agent</span> tab.
      </p>
      <div className="mt-5 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Provisioning your assistant…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            No Vapi number yet — we'll finish this the first time you visit the AI agent tab.
          </div>
        ) : rows.map((r) => (
          <div key={r.number} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
            <div className="font-medium">{r.number}</div>
            <div className={r.assistantId ? "text-success" : "text-muted-foreground"}>
              {r.assistantId ? "Assistant ready" : "Pending"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
