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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Trash2, Plus, CalendarDays } from "lucide-react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scheduling")({ component: SchedulingPage });

const ROLE_STYLES: Record<string, string> = {
  emergency: "border-red-200 bg-red-50 text-red-800",
  sales: "border-amber-200 bg-amber-50 text-amber-900",
  service: "border-sky-200 bg-sky-50 text-sky-900",
  office: "border-stone-200 bg-stone-50 text-stone-800",
  all: "border-purple-200 bg-purple-50 text-purple-800",
};

function roleLabel(role?: string | null) {
  if (!role) return "Office";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function dayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

const WHOLE_BUSINESS = "__whole_business__";

function blackoutScopeLabel(blackout: any, teamById: Map<string, any>) {
  if (!blackout.team_member_id) return "Whole business";
  return teamById.get(blackout.team_member_id)?.name ?? "Agent";
}

function blackoutWindowLabel(blackout: any) {
  const start = new Date(blackout.start_at);
  const end = new Date(blackout.end_at);
  const sameDay = dayKey(start) === dayKey(end);
  if (sameDay) return `${format(start, "MMM d")} · ${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
  return `${format(start, "MMM d, h:mm a")} - ${format(end, "MMM d, h:mm a")}`;
}

function localDayBounds(date: string) {
  return {
    startAt: new Date(`${date}T00:00:00`).toISOString(),
    endAt: new Date(`${date}T23:59:59.999`).toISOString(),
  };
}

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
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const [newAppt, setNewAppt] = useState({ teamMemberId: "", scheduledFor: "", customerName: "", customerPhone: "", service: "", durationMinutes: 60 });
  const [newBlack, setNewBlack] = useState({ teamMemberId: WHOLE_BUSINESS, allDay: false, date: "", startAt: "", endAt: "", reason: "" });
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [blackoutOpen, setBlackoutOpen] = useState(false);

  const reload = async (targetMonth = month) => {
    const from = startOfWeek(startOfMonth(targetMonth));
    const to = endOfWeek(endOfMonth(targetMonth));
    const r = await fetchSchedule({ data: { from: from.toISOString(), to: to.toISOString() } });
    setEnabledState(r.schedulingEnabled);
    setAppts(r.appointments); setBlackouts(r.blackouts); setTeam(r.teamMembers);
    setBusiness(r.business);
  };

  useEffect(() => {
    setLoading(true);
    reload(month).finally(() => setLoading(false));
    /* eslint-disable-next-line */
  }, [month]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });
  const teamById = new Map(team.map((member) => [member.id, member]));
  const apptsByDay = new Map<string, any[]>();
  appts.forEach((appt) => {
    const key = dayKey(new Date(appt.scheduled_for));
    apptsByDay.set(key, [...(apptsByDay.get(key) ?? []), appt]);
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Scheduling</h1>
          <p className="text-sm text-muted-foreground">Multi-agent calendar with appointments, agent blackouts, and business closures.</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border p-2">
          <Switch checked={enabled} onCheckedChange={async (v) => { await setEnabled({ data: { enabled: v } }); setEnabledState(v); toast.success(v ? "Scheduling enabled" : "Scheduling disabled"); }} />
          <span className="text-xs">Enabled</span>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              Monthly calendar
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Color coded by assigned team role.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setMonth(subMonths(month, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
            <Button variant="outline" size="sm" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="border-b border-border px-4 py-3 text-lg font-semibold">{format(month, "MMMM yyyy")}</div>
        <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="px-2 py-2">{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = dayKey(day);
            const dayAppts = apptsByDay.get(key) ?? [];
            return (
              <div key={key} className={`min-h-28 border-b border-r border-border p-2 ${isSameMonth(day, month) ? "bg-card" : "bg-muted/20 text-muted-foreground"}`}>
                <div className={`mb-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium ${isToday(day) ? "bg-primary text-primary-foreground" : ""}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayAppts.slice(0, 3).map((appt) => {
                    const agent = teamById.get(appt.team_member_id);
                    const role = agent?.role ?? "office";
                    return (
                      <div key={appt.id} className={`rounded-md border px-1.5 py-1 text-[11px] leading-tight ${ROLE_STYLES[role] ?? ROLE_STYLES.office}`}>
                        <div className="truncate font-medium">{format(new Date(appt.scheduled_for), "h:mm a")} · {appt.customer_name || "Appointment"}</div>
                        <div className="truncate opacity-80">{roleLabel(role)}{agent?.name ? ` · ${agent.name}` : ""}</div>
                      </div>
                    );
                  })}
                  {dayAppts.length > 3 && <div className="text-[11px] text-muted-foreground">+{dayAppts.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 p-4 text-xs">
          {Object.entries(ROLE_STYLES).map(([role, classes]) => (
            <span key={role} className={`rounded-full border px-2 py-1 ${classes}`}>{roleLabel(role)}</span>
          ))}
        </div>
      </Card>

      {!enabled ? (
        <Card className="p-5 text-sm text-muted-foreground">Scheduling is off. Toggle it on above to manage appointments and blackouts.</Card>
      ) : (
        <>
          <Card className="space-y-3 p-5">
            <div>
              <div className="text-sm font-semibold">Booking links (<code>{"{book_consult}"}</code>)</div>
              <p className="text-xs text-muted-foreground">
                Cal.com and Calendly links work now. Native Jobber and Housecall Pro booking links are coming soon; connected provider sync is handled by CallRecover without a mobile app update.
              </p>
            </div>
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
            {/*
            <p className="text-xs text-muted-foreground">Google Calendar 2-way sync coming in a follow-up — uses per-agent OAuth.</p>
          </Card>

            */}
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" onClick={() => setAppointmentOpen(true)}>
              <Plus className="h-3 w-3" /> New appointment
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBlackoutOpen(true)}>
              <Plus className="h-3 w-3" /> Agent blackout
            </Button>
          </div>

          <Dialog open={appointmentOpen} onOpenChange={setAppointmentOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>New appointment</DialogTitle>
                <DialogDescription>Book a recovered lead or manual follow-up without crowding the calendar.</DialogDescription>
              </DialogHeader>
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
              <Button onClick={async () => {
                if (!newAppt.teamMemberId || !newAppt.scheduledFor) { toast.error("Agent and time required"); return; }
                try {
                  await book({ data: { ...newAppt, scheduledFor: new Date(newAppt.scheduledFor).toISOString() } });
                  toast.success("Booked");
                  setNewAppt({ teamMemberId: "", scheduledFor: "", customerName: "", customerPhone: "", service: "", durationMinutes: 60 });
                  setAppointmentOpen(false);
                  await reload(month);
                } catch (e: any) { toast.error(e.message); }
              }}><Plus className="h-3 w-3" /> Book appointment</Button>
            </DialogContent>
          </Dialog>

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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">Cancel</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This marks the appointment as cancelled and removes it from active scheduling views.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep appointment</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => { await cancel({ data: { id: a.id } }); await reload(month); }}>
                              Yes, cancel appointment
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Dialog open={blackoutOpen} onOpenChange={setBlackoutOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Agent blackout dates</DialogTitle>
                <DialogDescription>Block the whole business, one agent, a full day, or a partial time window.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Scope</Label>
                  <Select value={newBlack.teamMemberId} onValueChange={(v) => setNewBlack({ ...newBlack, teamMemberId: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={WHOLE_BUSINESS}>Whole business</SelectItem>
                      {team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3 sm:col-span-2">
                  <div>
                    <Label className="text-sm">Full day</Label>
                    <p className="text-xs text-muted-foreground">Turn off for a specific time block on one date.</p>
                  </div>
                  <Switch checked={newBlack.allDay} onCheckedChange={(allDay) => setNewBlack({ ...newBlack, allDay })} />
                </div>
                {newBlack.allDay ? (
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={newBlack.date} onChange={(e) => setNewBlack({ ...newBlack, date: e.target.value })} />
                  </div>
                ) : (
                  <>
                    <div><Label className="text-xs">Start</Label><Input type="datetime-local" value={newBlack.startAt} onChange={(e) => setNewBlack({ ...newBlack, startAt: e.target.value })} /></div>
                    <div><Label className="text-xs">End</Label><Input type="datetime-local" value={newBlack.endAt} onChange={(e) => setNewBlack({ ...newBlack, endAt: e.target.value })} /></div>
                  </>
                )}
                <div className="sm:col-span-2"><Label className="text-xs">Reason</Label><Input value={newBlack.reason} onChange={(e) => setNewBlack({ ...newBlack, reason: e.target.value })} /></div>
              </div>
              <Button onClick={async () => {
                if (newBlack.allDay && !newBlack.date) { toast.error("Date required"); return; }
                if (!newBlack.allDay && (!newBlack.startAt || !newBlack.endAt)) { toast.error("Start and end required"); return; }
                try {
                  const window = newBlack.allDay
                    ? localDayBounds(newBlack.date)
                    : { startAt: new Date(newBlack.startAt).toISOString(), endAt: new Date(newBlack.endAt).toISOString() };
                  await upBlackout({ data: { teamMemberId: newBlack.teamMemberId === WHOLE_BUSINESS ? null : newBlack.teamMemberId, startAt: window.startAt, endAt: window.endAt, reason: newBlack.reason || undefined } });
                  setNewBlack({ teamMemberId: WHOLE_BUSINESS, allDay: false, date: "", startAt: "", endAt: "", reason: "" });
                  setBlackoutOpen(false);
                  await reload(month); toast.success("Blackout added");
                } catch (e: any) { toast.error(e.message); }
              }}><Plus className="h-3 w-3" /> Add blackout</Button>
            </DialogContent>
          </Dialog>

          <Card className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Agent blackout dates</div>
                <p className="text-xs text-muted-foreground">Whole-day closures or partial-day blocks by agent.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setBlackoutOpen(true)}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            <div className="divide-y">
              {blackouts.length === 0 && <div className="py-2 text-xs text-muted-foreground">No blackout dates.</div>}
              {blackouts.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                  <div>
                    <div className="font-medium">{blackoutScopeLabel(b, teamById)} · {blackoutWindowLabel(b)}</div>
                    <div className="text-muted-foreground">{b.reason || "Unavailable"}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={async () => { await delBlackout({ data: { id: b.id } }); await reload(month); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
