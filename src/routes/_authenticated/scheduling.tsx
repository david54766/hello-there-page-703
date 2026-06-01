import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSchedule, bookAppointment, cancelAppointment, upsertBlackout, deleteBlackout, setSchedulingEnabled, updateBusinessTags } from "@/lib/schedule.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scheduling")({ component: SchedulingPage });

function SchedulingPage() {
  const fetchSchedule = useServerFn(getSchedule);
  const book = useServerFn(bookAppointment);
  const cancel = useServerFn(cancelAppointment);
  const upBlackout = useServerFn(upsertBlackout);
  const delBlackout = useServerFn(deleteBlackout);
  const setEnabled = useServerFn(setSchedulingEnabled);
  const updateTags = useServerFn(updateBusinessTags);

  const [loading, setLoading] = useState(true);
  const [enabled, setEnabledState] = useState(false);
  const [appts, setAppts] = useState<any[]>([]);
  const [blackouts, setBlackouts] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [business, setBusiness] = useState<any>(null);

  const [newAppt, setNewAppt] = useState({ teamMemberId: "", scheduledFor: "", customerName: "", customerPhone: "", service: "", durationMinutes: 60 });
  const [newBlack, setNewBlack] = useState({ teamMemberId: "", startAt: "", endAt: "", reason: "" });

  const reload = async () => {
    const from = new Date(); from.setDate(from.getDate() - 7);
    const to = new Date(); to.setDate(to.getDate() + 60);
    const r = await fetchSchedule({ data: { from: from.toISOString(), to: to.toISOString() } });
    setEnabledState(r.schedulingEnabled);
    setAppts(r.appointments); setBlackouts(r.blackouts); setTeam(r.teamMembers);
    setBusiness(r.business);
  };

  useEffect(() => { reload().finally(() => setLoading(false)); /* eslint-disable-next-line */ }, []);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Scheduling</h1>
          <p className="text-sm text-muted-foreground">Multi-agent calendar with blackout dates. Optional — enable per contractor.</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border p-2">
          <Switch checked={enabled} onCheckedChange={async (v) => { await setEnabled({ data: { enabled: v } }); setEnabledState(v); toast.success(v ? "Scheduling enabled" : "Scheduling disabled"); }} />
          <span className="text-xs">Enabled</span>
        </div>
      </div>

      {!enabled ? (
        <Card className="p-5 text-sm text-muted-foreground">Scheduling is off. Toggle it on above to manage appointments and blackouts.</Card>
      ) : (
        <>
          <Card className="space-y-3 p-5">
            <div className="text-sm font-semibold">Booking links (used for <code>{"{book_consult}"}</code>)</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Cal.com URL</Label>
                <Input defaultValue={business?.cal_url ?? ""} onBlur={(e) => updateTags({ data: { cal_url: e.target.value } })} placeholder="https://cal.com/you" />
              </div>
              <div>
                <Label className="text-xs">Calendly URL</Label>
                <Input defaultValue={business?.calendly_url ?? ""} onBlur={(e) => updateTags({ data: { calendly_url: e.target.value } })} placeholder="https://calendly.com/you" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Google Calendar 2-way sync coming in a follow-up — uses per-agent OAuth.</p>
          </Card>

          <Card className="space-y-3 p-5">
            <div className="text-sm font-semibold">New appointment</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Agent</Label>
                <Select value={newAppt.teamMemberId} onValueChange={(v) => setNewAppt({ ...newAppt, teamMemberId: v })}>
                  <SelectTrigger><SelectValue placeholder={team.length ? "Pick agent" : "Add team members first"} /></SelectTrigger>
                  <SelectContent>
                    {team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">When</Label>
                <Input type="datetime-local" value={newAppt.scheduledFor} onChange={(e) => setNewAppt({ ...newAppt, scheduledFor: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Customer name</Label>
                <Input value={newAppt.customerName} onChange={(e) => setNewAppt({ ...newAppt, customerName: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Customer phone</Label>
                <Input value={newAppt.customerPhone} onChange={(e) => setNewAppt({ ...newAppt, customerPhone: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Service</Label>
                <Input value={newAppt.service} onChange={(e) => setNewAppt({ ...newAppt, service: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" min={15} max={480} value={newAppt.durationMinutes} onChange={(e) => setNewAppt({ ...newAppt, durationMinutes: Number(e.target.value) || 60 })} />
              </div>
            </div>
            <Button size="sm" onClick={async () => {
              if (!newAppt.teamMemberId || !newAppt.scheduledFor) { toast.error("Agent and time required"); return; }
              try {
                await book({ data: { ...newAppt, scheduledFor: new Date(newAppt.scheduledFor).toISOString() } });
                toast.success("Booked");
                setNewAppt({ teamMemberId: "", scheduledFor: "", customerName: "", customerPhone: "", service: "", durationMinutes: 60 });
                await reload();
              } catch (e: any) { toast.error(e.message); }
            }}><Plus className="h-3 w-3" /> Book</Button>
          </Card>

          <Card className="p-0">
            <div className="border-b border-border p-3 text-sm font-semibold">Upcoming appointments</div>
            <div className="divide-y">
              {appts.length === 0 && <div className="p-4 text-sm text-muted-foreground">No appointments.</div>}
              {appts.map((a) => {
                const agent = team.find((t) => t.id === a.team_member_id);
                return (
                  <div key={a.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{new Date(a.scheduled_for).toLocaleString()} · {agent?.name ?? "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">{a.customer_name ?? ""} {a.customer_phone ? `· ${a.customer_phone}` : ""} {a.service ? `· ${a.service}` : ""} · {a.status} · {a.source}</div>
                    </div>
                    {a.status !== "cancelled" && (
                      <Button variant="ghost" size="sm" onClick={async () => { await cancel({ data: { id: a.id } }); await reload(); }}>Cancel</Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <div className="text-sm font-semibold">Blackout dates</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="sm:col-span-1">
                <Label className="text-xs">Agent (optional)</Label>
                <Select value={newBlack.teamMemberId} onValueChange={(v) => setNewBlack({ ...newBlack, teamMemberId: v })}>
                  <SelectTrigger><SelectValue placeholder="Whole business" /></SelectTrigger>
                  <SelectContent>
                    {team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Start</Label><Input type="datetime-local" value={newBlack.startAt} onChange={(e) => setNewBlack({ ...newBlack, startAt: e.target.value })} /></div>
              <div><Label className="text-xs">End</Label><Input type="datetime-local" value={newBlack.endAt} onChange={(e) => setNewBlack({ ...newBlack, endAt: e.target.value })} /></div>
              <div><Label className="text-xs">Reason</Label><Input value={newBlack.reason} onChange={(e) => setNewBlack({ ...newBlack, reason: e.target.value })} /></div>
            </div>
            <Button size="sm" onClick={async () => {
              if (!newBlack.startAt || !newBlack.endAt) { toast.error("Start and end required"); return; }
              try {
                await upBlackout({ data: { teamMemberId: newBlack.teamMemberId || null, startAt: new Date(newBlack.startAt).toISOString(), endAt: new Date(newBlack.endAt).toISOString(), reason: newBlack.reason || undefined } });
                setNewBlack({ teamMemberId: "", startAt: "", endAt: "", reason: "" });
                await reload(); toast.success("Blackout added");
              } catch (e: any) { toast.error(e.message); }
            }}><Plus className="h-3 w-3" /> Add blackout</Button>
            <div className="divide-y">
              {blackouts.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                  <div>{new Date(b.start_at).toLocaleString()} → {new Date(b.end_at).toLocaleString()} {b.reason ? `· ${b.reason}` : ""}</div>
                  <Button variant="ghost" size="sm" onClick={async () => { await delBlackout({ data: { id: b.id } }); await reload(); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}