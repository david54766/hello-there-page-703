import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SmsComplianceCard, CampaignRegistrationCard } from "@/components/sms-compliance";
import { US_HOLIDAY_PRESETS } from "@/lib/holidays";
import { listMyFactors, enrollFactor, verifyEnrollment, disableFactor } from "@/lib/mfa.functions";
import { scanSetupWebsite } from "@/lib/setup-scan.functions";
import { CONTRACTOR_TYPES, type ContractorType } from "@/lib/contractor-data";
import { Badge } from "@/components/ui/badge";
import { Trash2, ShieldCheck, Mail, Smartphone, Sparkles, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WEB_FORM_SMS_CONSENT_TEXT } from "@/lib/sms-consent-copy";
import { DEFAULT_VOICE_ID, VOICE_OPTIONS, getVoice } from "@/lib/voices";

export const Route = createFileRoute("/_authenticated/settings")({ component: Settings });

type Biz = {
  id: string;
  business_name: string;
  contractor_type: ContractorType | null;
  owner_phone: string | null;
  business_phone: string | null;
  avg_job_value: number;
  notify_sms: boolean;
  notify_email: boolean;
  notify_dashboard: boolean;
  notify_email_address: string | null;
  auto_send_ai_replies: boolean;
  scheduling_provider: "hcp" | "jobber" | "internal";
  hcp_api_key: string | null;
  jobber_refresh_token: string | null;
  agent_voice_id: string | null;
  agent_prompt_override: string | null;
  address: string | null;
  website: string | null;
  website_blurb: string | null;
  booking_url: string | null;
  callback_form_url: string | null;
  sms_consent_text: string | null;
  default_hello_script: string | null;
  cal_url: string | null;
  calendly_url: string | null;
  scheduling_enabled: boolean;
  observed_holidays: { id: string; name: string }[];
};

function Settings() {
  const { user } = useAuth();
  const scanWebsite = useServerFn(scanSetupWebsite);
  const [biz, setBiz] = useState<Biz | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanningWebsite, setScanningWebsite] = useState(false);
  const [voicePreviewing, setVoicePreviewing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("businesses")
      .select("id, business_name, contractor_type, owner_phone, business_phone, avg_job_value, notify_sms, notify_email, notify_dashboard, notify_email_address, auto_send_ai_replies, scheduling_provider, hcp_api_key, jobber_refresh_token, agent_voice_id, agent_prompt_override, address, website, website_blurb, booking_url, callback_form_url, sms_consent_text, default_hello_script, cal_url, calendly_url, scheduling_enabled, observed_holidays")
      .eq("owner_id", user.id).maybeSingle().then(({ data }) => {
        if (!data) return;
        const d = data as unknown as Biz;
        setBiz({ ...d, observed_holidays: Array.isArray(d.observed_holidays) ? d.observed_holidays : [] });
      });
  }, [user]);

  async function syncVapiAgent() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("No active session");
    const res = await fetch("/api/mobile/sync-vapi-agent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ forceRefresh: true }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "Assistant sync failed");
    }
  }

  async function save() {
    if (!biz) return;
    setSaving(true);
    const { error } = await supabase.from("businesses").update({
      business_name: biz.business_name,
      contractor_type: biz.contractor_type,
      owner_phone: biz.owner_phone,
      business_phone: biz.business_phone,
      avg_job_value: biz.avg_job_value,
      notify_sms: biz.notify_sms,
      notify_email: biz.notify_email,
      notify_dashboard: biz.notify_dashboard,
      notify_email_address: biz.notify_email_address,
      auto_send_ai_replies: biz.auto_send_ai_replies,
      scheduling_provider: biz.scheduling_provider,
      hcp_api_key: biz.hcp_api_key,
      jobber_refresh_token: biz.jobber_refresh_token,
      agent_voice_id: biz.agent_voice_id,
      agent_prompt_override: biz.agent_prompt_override,
      address: biz.address,
      website: biz.website,
      website_blurb: biz.website_blurb,
      booking_url: biz.booking_url,
      callback_form_url: biz.callback_form_url,
      default_hello_script: biz.default_hello_script,
      cal_url: biz.cal_url,
      calendly_url: biz.calendly_url,
      scheduling_enabled: biz.scheduling_enabled,
      observed_holidays: biz.observed_holidays,
    }).eq("id", biz.id);
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }
    // Materialize holidays as blackouts (current + next year), idempotently.
    try {
      const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
      const rows = biz.observed_holidays.flatMap((h) => {
        const preset = US_HOLIDAY_PRESETS.find((p) => p.id === h.id);
        if (!preset) return [];
        return years.map((y) => {
          const date = preset.dateFor(y);
          return {
            business_id: biz.id,
            team_member_id: null,
            start_at: `${date}T00:00:00Z`,
            end_at: `${date}T23:59:59Z`,
            reason: `Holiday: ${preset.name}`,
          };
        });
      });
      // Wipe prior holiday-reason rows, then re-insert.
      await supabase.from("schedule_blackouts").delete().eq("business_id", biz.id).like("reason", "Holiday: %");
      if (rows.length > 0) await supabase.from("schedule_blackouts").insert(rows);
    } catch {
      /* non-fatal */
    }
    try {
      await syncVapiAgent();
    } catch (error) {
      setSaving(false);
      toast.error(`Saved, but assistant sync failed: ${error instanceof Error ? error.message : "unknown error"}`);
      return;
    }
    setSaving(false);
    toast.success("Saved and assistant synced");
  }

  async function autoFillFromWebsite() {
    if (!biz?.website) return toast.error("Add the business website first.");
    setScanningWebsite(true);
    try {
      const result = await scanWebsite({ data: { url: biz.website } });
      setBiz({
        ...biz,
        business_name: result.businessName || biz.business_name,
        contractor_type: (result.contractorType as ContractorType | null) || biz.contractor_type,
        business_phone: result.businessPhone || biz.business_phone,
        address: result.address || biz.address,
        website: result.website || biz.website,
        website_blurb: result.websiteBlurb || biz.website_blurb,
        booking_url: result.bookingUrl || biz.booking_url,
        callback_form_url: result.callbackFormUrl || biz.callback_form_url,
        default_hello_script: result.defaultGreeting || biz.default_hello_script,
      });
      toast.success("Website scan applied. Review the fields, then save changes.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not scan the website.");
    } finally {
      setScanningWebsite(false);
    }
  }

  async function previewVoice() {
    if (!biz) return;
    const voiceId = biz.agent_voice_id || DEFAULT_VOICE_ID;
    const voice = getVoice(voiceId);
    setVoicePreviewing(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in again to preview voices.");
      const res = await fetch("/api/mobile/voice-preview", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voiceId,
          text: `Thanks for calling. My name is ${voice.label}, and I can take the details so the team can follow up quickly.`,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Voice preview failed");
      await new Audio(`data:${body.mimeType};base64,${body.audioBase64}`).play();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Voice preview failed");
    } finally {
      setVoicePreviewing(false);
    }
  }

  if (!biz) return <div className="p-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="voice-sms">Voice &amp; SMS</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6">
      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">Business</h2>
        <div className="space-y-1.5">
          <Label>Business name</Label>
          <Input value={biz.business_name} onChange={(e) => setBiz({ ...biz, business_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Business type</Label>
          <Select value={biz.contractor_type ?? ""} onValueChange={(v) => setBiz({ ...biz, contractor_type: v as ContractorType })}>
            <SelectTrigger><SelectValue placeholder="Select a trade" /></SelectTrigger>
            <SelectContent>
              {CONTRACTOR_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Business phone</Label>
          <Input value={biz.business_phone ?? ""} onChange={(e) => setBiz({ ...biz, business_phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Owner cell phone</Label>
          <Input value={biz.owner_phone ?? ""} onChange={(e) => setBiz({ ...biz, owner_phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Average job value ($)</Label>
          <Input type="number" value={biz.avg_job_value} onChange={(e) => setBiz({ ...biz, avg_job_value: Number(e.target.value) || 0 })} />
        </div>
      </Card>
      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">Tag values</h2>
        <p className="-mt-3 text-xs text-muted-foreground">Default values inserted into prompts and first messages via {"{business}"}, {"{website}"}, {"{book_consult}"}…</p>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Input value={biz.address ?? ""} onChange={(e) => setBiz({ ...biz, address: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Input value={biz.website ?? ""} onChange={(e) => setBiz({ ...biz, website: e.target.value })} placeholder="https://" />
        </div>
        <Button type="button" variant="secondary" onClick={autoFillFromWebsite} disabled={scanningWebsite || !biz.website}>
          <Sparkles className="h-4 w-4" />
          {scanningWebsite ? "Scanning website..." : "Scan website with AI"}
        </Button>
        <div className="space-y-1.5">
          <Label>Website blurb ({"{website_info}"})</Label>
          <Textarea rows={3} value={biz.website_blurb ?? ""} onChange={(e) => setBiz({ ...biz, website_blurb: e.target.value })} placeholder="Short description the agent reads if asked about your site." />
        </div>
        <div className="space-y-1.5">
          <Label>Booking URL ({"{book_consult}"})</Label>
          <Input value={biz.booking_url ?? ""} onChange={(e) => setBiz({ ...biz, booking_url: e.target.value })} placeholder="https://" />
        </div>
        <div className="space-y-1.5">
          <Label>Callback form URL ({"{callback_form}"})</Label>
          <Input value={biz.callback_form_url ?? ""} onChange={(e) => setBiz({ ...biz, callback_form_url: e.target.value })} placeholder="https://" />
        </div>
        <div className="space-y-1.5">
          <Label>Locked SMS consent text ({"{sms_consent}"})</Label>
          <Textarea rows={4} value={WEB_FORM_SMS_CONSENT_TEXT} readOnly className="resize-none bg-muted/40 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            This compliance wording is managed by CallRecover and cannot be edited per client.
          </p>
        </div>
      </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <Row label="SMS alerts" hint="Text your phone when a new lead comes in" checked={biz.notify_sms} onChange={(v) => setBiz({ ...biz, notify_sms: v })} />
        <Row label="Email alerts" hint="Send a digest to your inbox" checked={biz.notify_email} onChange={(v) => setBiz({ ...biz, notify_email: v })} />
        {biz.notify_email && (
          <div className="space-y-1.5">
            <Label>Notification email</Label>
            <Input type="email" value={biz.notify_email_address ?? ""} onChange={(e) => setBiz({ ...biz, notify_email_address: e.target.value })} />
          </div>
        )}
        <Row label="Dashboard alerts" hint="Realtime bell + toast in this app" checked={biz.notify_dashboard} onChange={(v) => setBiz({ ...biz, notify_dashboard: v })} />
      </Card>
      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">AI replies</h2>
        <Row label="Auto-send AI follow-ups" hint="After SMS double opt-in, CallRecover can send short qualifying replies to customer texts before your team responds." checked={biz.auto_send_ai_replies} onChange={(v) => setBiz({ ...biz, auto_send_ai_replies: v })} />
      </Card>
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-6">
      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">Scheduling provider</h2>
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <Select value={biz.scheduling_provider} onValueChange={(v) => setBiz({ ...biz, scheduling_provider: v as Biz["scheduling_provider"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">In-app only</SelectItem>
              <SelectItem value="hcp">Housecall Pro</SelectItem>
              <SelectItem value="jobber">Jobber</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            In-app scheduling is live. Housecall Pro and Jobber are optional future external syncs and are not required for CallRecover bookings.
          </p>
        </div>
        {biz.scheduling_provider === "hcp" && (
          <div className="space-y-1.5">
            <Label>Housecall Pro API key</Label>
            <Input type="password" value={biz.hcp_api_key ?? ""} onChange={(e) => setBiz({ ...biz, hcp_api_key: e.target.value })} placeholder="hcp_…" />
            <p className="text-xs text-muted-foreground">Settings → API in your HCP account.</p>
          </div>
        )}
        {biz.scheduling_provider === "jobber" && (
          <div className="space-y-1.5">
            <Label>Jobber refresh token</Label>
            <Input type="password" value={biz.jobber_refresh_token ?? ""} onChange={(e) => setBiz({ ...biz, jobber_refresh_token: e.target.value })} />
            <p className="text-xs text-muted-foreground">OAuth setup coming — paste manually for now.</p>
          </div>
        )}
      </Card>
      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">In-app scheduling</h2>
        <Row label="Enable in-app scheduling" hint="Show the Scheduling tab and let calls book consultations" checked={biz.scheduling_enabled} onChange={(v) => setBiz({ ...biz, scheduling_enabled: v })} />
        <div className="space-y-1.5">
          <Label>Cal.com link (optional)</Label>
          <Input value={biz.cal_url ?? ""} onChange={(e) => setBiz({ ...biz, cal_url: e.target.value })} placeholder="https://cal.com/yourname" />
        </div>
        <div className="space-y-1.5">
          <Label>Calendly link (optional)</Label>
          <Input value={biz.calendly_url ?? ""} onChange={(e) => setBiz({ ...biz, calendly_url: e.target.value })} placeholder="https://calendly.com/yourname" />
        </div>
      </Card>
      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Observed holidays</h2>
          <p className="text-xs text-muted-foreground">
            Toggle each holiday <span className="font-medium">On</span> to block it out on your scheduling calendar for this year and next,
            or <span className="font-medium">Off</span> to keep taking bookings that day. Holidays stay Off by default — nothing is disabled automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setBiz({ ...biz, observed_holidays: US_HOLIDAY_PRESETS.map((h) => ({ id: h.id, name: h.name })) })}
          >
            Turn all on
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setBiz({ ...biz, observed_holidays: [] })}
          >
            Turn all off
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {US_HOLIDAY_PRESETS.map((h) => {
            const checked = biz.observed_holidays.some((x) => x.id === h.id);
            return (
              <div key={h.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{h.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {h.dateFor(new Date().getFullYear())} · {checked ? "Blocked out" : "Open for bookings"}
                  </div>
                </div>
                <Switch
                  checked={checked}
                  onCheckedChange={(v) => {
                    const next = v
                      ? [...biz.observed_holidays, { id: h.id, name: h.name }]
                      : biz.observed_holidays.filter((x) => x.id !== h.id);
                    setBiz({ ...biz, observed_holidays: next });
                  }}
                />
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Changes take effect when you click <span className="font-medium">Save changes</span> at the bottom.</p>
      </Card>
        </TabsContent>

        <TabsContent value="voice-sms" className="space-y-6">
      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">Voice agent</h2>
        <div className="space-y-1.5">
          <Label>Voice</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            <Select value={biz.agent_voice_id || DEFAULT_VOICE_ID} onValueChange={(v) => setBiz({ ...biz, agent_voice_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VOICE_OPTIONS.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>{voice.label} - {voice.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={previewVoice} disabled={voicePreviewing}>
              {voicePreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Preview
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {getVoice(biz.agent_voice_id).label}: {getVoice(biz.agent_voice_id).description}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Custom agent prompt (optional)</Label>
          <Textarea rows={6} value={biz.agent_prompt_override ?? ""} onChange={(e) => setBiz({ ...biz, agent_prompt_override: e.target.value })} placeholder="Leave blank to use the contractor-aware default." />
        </div>
      </Card>
      <SmsComplianceCard />
      <CampaignRegistrationCard />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
      <TwoFactorCard userEmail={user?.email ?? ""} />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
  );
}

function Row({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

type Factor = { id: string; factor_type: "email" | "sms"; destination: string; enabled: boolean; verified: boolean };

function TwoFactorCard({ userEmail }: { userEmail: string }) {
  const list = useServerFn(listMyFactors);
  const enroll = useServerFn(enrollFactor);
  const verify = useServerFn(verifyEnrollment);
  const disableFn = useServerFn(disableFactor);

  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<"email" | "sms">("email");
  const [dest, setDest] = useState(userEmail);
  const [pending, setPending] = useState<{ factorId: string; masked: string } | null>(null);
  const [code, setCode] = useState("");

  async function refresh() {
    const r = await list();
    setFactors(r.factors as Factor[]);
  }
  useEffect(() => { refresh().catch(() => {}); }, []);
  useEffect(() => { if (type === "email") setDest(userEmail); else setDest(""); }, [type, userEmail]);

  async function onEnroll() {
    setBusy(true);
    try {
      const r = await enroll({ data: { type, destination: dest } });
      setPending({ factorId: r.factorId, masked: r.masked });
      toast.success(`Code sent to ${r.masked}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    if (!pending) return;
    setBusy(true);
    try {
      await verify({ data: { factorId: pending.factorId, code } });
      toast.success("Two-factor enabled");
      setPending(null); setCode("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setBusy(true);
    try {
      await disableFn({ data: { factorId: id } });
      toast.success("Two-factor removed");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Two-factor authentication</h2>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">Require a one-time code in addition to your password when signing in.</p>

      <div className="space-y-2">
        {factors === null ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : factors.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">No 2FA methods yet.</div>
        ) : factors.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="flex items-center gap-3">
              {f.factor_type === "email" ? <Mail className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              <div>
                <div className="text-sm font-medium">{f.destination}</div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <Badge variant={f.enabled ? "default" : "secondary"}>{f.enabled ? "Active" : "Pending"}</Badge>
                  <span>{f.factor_type === "email" ? "Email" : "SMS (Twilio)"}</span>
                </div>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onRemove(f.id)} disabled={busy}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {!pending ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="text-sm font-medium">Add a method</div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setType("email")} className={`rounded-md border p-2 text-sm ${type === "email" ? "border-primary bg-primary/5" : "border-border"}`}>
              <Mail className="mx-auto h-4 w-4" /><div className="mt-1">Email</div>
            </button>
            <button type="button" onClick={() => setType("sms")} className={`rounded-md border p-2 text-sm ${type === "sms" ? "border-primary bg-primary/5" : "border-border"}`}>
              <Smartphone className="mx-auto h-4 w-4" /><div className="mt-1">SMS</div>
            </button>
          </div>
          <div className="space-y-1.5">
            <Label>{type === "email" ? "Email address" : "Phone (E.164, e.g. +15551234567)"}</Label>
            <Input value={dest} onChange={(e) => setDest(e.target.value)} placeholder={type === "email" ? "you@example.com" : "+15551234567"} />
          </div>
          <Button size="sm" onClick={onEnroll} disabled={busy || !dest}>Send verification code</Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-primary/40 bg-primary/5 p-3">
          <div className="text-sm">Enter the 6-digit code sent to <span className="font-medium">{pending.masked}</span>.</div>
          <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
          <div className="flex gap-2">
            <Button size="sm" onClick={onVerify} disabled={busy || code.length !== 6}>Verify & enable</Button>
            <Button size="sm" variant="ghost" onClick={() => { setPending(null); setCode(""); }}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
