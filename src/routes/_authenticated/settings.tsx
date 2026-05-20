import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: Settings });

function Settings() {
  const { user } = useAuth();
  const [biz, setBiz] = useState<{ id: string; business_name: string; owner_phone: string | null; business_phone: string | null; avg_job_value: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("businesses").select("id, business_name, owner_phone, business_phone, avg_job_value").eq("owner_id", user.id).maybeSingle().then(({ data }) => setBiz(data));
  }, [user]);

  async function save() {
    if (!biz) return;
    setSaving(true);
    const { error } = await supabase.from("businesses").update({
      business_name: biz.business_name,
      owner_phone: biz.owner_phone,
      business_phone: biz.business_phone,
      avg_job_value: biz.avg_job_value,
    }).eq("id", biz.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  }

  if (!biz) return <div className="p-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Update your business details.</p>
      <Card className="mt-6 space-y-5 p-6">
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
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </Card>
    </div>
  );
}
