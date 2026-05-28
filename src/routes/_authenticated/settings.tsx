import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SmsComplianceCard, CampaignRegistrationCard } from "@/components/sms-compliance";
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
};

function Settings() {
  const { user } = useAuth();
  const [biz, setBiz] = useState<Biz | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("businesses")
      .select("id, business_name, owner_phone, business_phone, avg_job_value, notify_sms, notify_email, notify_dashboard, notify_email_address, auto_send_ai_replies, scheduling_provider, hcp_api_key, jobber_refresh_token, agent_voice_id, agent_prompt_override")
      .eq("owner_id", user.id).maybeSingle().then(({ data }) => setBiz(data as Biz));
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
    }).eq("id", biz.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
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
