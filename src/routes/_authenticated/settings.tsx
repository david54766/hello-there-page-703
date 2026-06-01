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
import { Badge } from "@/components/ui/badge";
import { Trash2, ShieldCheck, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: Settings });

type Biz = {
  id: string;
  business_name: string;
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
  const [biz, setBiz] = useState<Biz | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("businesses")
      .select("id, business_name, owner_phone, business_phone, avg_job_value, notify_sms, notify_email, notify_dashboard, notify_email_address, auto_send_ai_replies, scheduling_provider, hcp_api_key, jobber_refresh_token, agent_voice_id, agent_prompt_override, address, website, website_blurb, booking_url, callback_form_url, sms_consent_text, default_hello_script, cal_url, calendly_url, scheduling_enabled, observed_holidays")
      .eq("owner_id", user.id).maybeSingle().then(({ data }) => {
        if (!data) return;
        const d = data as unknown as Biz;
        setBiz({ ...d, observed_holidays: Array.isArray(d.observed_holidays) ? d.observed_holidays : [] });
      });
  }, [user]);

  async function save() {
    if (!biz) return;
    setSaving(true);
    const { error } = await supabase.from("businesses").update({
      business_name: biz.business_name,
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
      sms_consent_text: biz.sms_consent_text,
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
    setSaving(false);
    toast.success("Saved");
  }

  if (!biz) return <div className="p-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">Business</h2>
        <div className="space-y-1.5">
          <Label>Business name</Label>
          <Input value={biz.business_name} onChange={(e) => setBiz({ ...biz, business_name: e.target.value })} />
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
        <Row label="Auto-send AI follow-ups" hint="AI replies to customer texts to qualify the lead before you respond" checked={biz.auto_send_ai_replies} onChange={(v) => setBiz({ ...biz, auto_send_ai_replies: v })} />
      </Card>

      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">Scheduling</h2>
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
        <h2 className="text-lg font-semibold">Voice agent</h2>
        <div className="space-y-1.5">
          <Label>ElevenLabs voice ID (optional)</Label>
          <Input value={biz.agent_voice_id ?? ""} onChange={(e) => setBiz({ ...biz, agent_voice_id: e.target.value })} placeholder="JBFqnCBsd6RMkjVDRZzb" />
        </div>
        <div className="space-y-1.5">
          <Label>Custom agent prompt (optional)</Label>
          <Textarea rows={6} value={biz.agent_prompt_override ?? ""} onChange={(e) => setBiz({ ...biz, agent_prompt_override: e.target.value })} placeholder="Leave blank to use the contractor-aware default." />
        </div>
      </Card>

      <SmsComplianceCard />
      <CampaignRegistrationCard />

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
          <Label>SMS consent text ({"{sms_consent}"})</Label>
          <Textarea rows={2} value={biz.sms_consent_text ?? ""} onChange={(e) => setBiz({ ...biz, sms_consent_text: e.target.value })} placeholder="By replying YES you agree to receive texts…" />
        </div>
        <div className="space-y-1.5">
          <Label>Default greeting ({"{hello_script}"})</Label>
          <Textarea rows={2} value={biz.default_hello_script ?? ""} onChange={(e) => setBiz({ ...biz, default_hello_script: e.target.value })} placeholder="Hello, thanks for calling {business}…" />
        </div>
      </Card>

      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">Scheduling</h2>
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
          <p className="text-xs text-muted-foreground">Selected days are blocked out on the scheduling calendar for this year and next.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {US_HOLIDAY_PRESETS.map((h) => {
            const checked = biz.observed_holidays.some((x) => x.id === h.id);
            return (
              <label key={h.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...biz.observed_holidays, { id: h.id, name: h.name }]
                      : biz.observed_holidays.filter((x) => x.id !== h.id);
                    setBiz({ ...biz, observed_holidays: next });
                  }}
                />
                <span>{h.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{h.dateFor(new Date().getFullYear()).slice(5)}</span>
              </label>
            );
          })}
        </div>
      </Card>

      <TwoFactorCard userEmail={user?.email ?? ""} />

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
