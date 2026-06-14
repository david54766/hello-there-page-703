import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  archiveLead,
  qualifyLead,
  restoreLead,
  sendLeadStatusText,
  updateLeadDetails,
  updateLeadStatus,
  scheduleCallback,
} from "@/lib/leads.functions";
import { assignLead } from "@/lib/dispatch.functions";
import { toast } from "sonner";
import { Sparkles, PhoneCall, Clock, Loader2, Save, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Call = {
  id: string;
  business_id: string;
  caller_number: string;
  caller_name: string | null;
  transcript: string | null;
  ai_summary_short: string | null;
  ai_summary: string | null;
  urgency: string;
  priority: string;
  lead_status: "open" | "contacted" | "scheduled" | "active" | "requesting_call" | "in_progress" | "closed";
  qualification: Record<string, string> | null;
  callback_requested: boolean;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
};

type Msg = { id: string; direction: string; body: string; created_at: string };

const STATUS_LABELS: Record<Call["lead_status"], string> = {
  open: "Open",
  contacted: "Contacted",
  scheduled: "Scheduled",
  active: "Active",
  requesting_call: "Requesting Call",
  in_progress: "In Progress",
  closed: "Closed",
};

const TEXTABLE_STATUSES = new Set<Call["lead_status"]>(["scheduled", "requesting_call", "in_progress"]);

function sortMessages(items: Msg[]) {
  return [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function LeadDrawer({ call, open, onOpenChange }: { call: Call | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [details, setDetails] = useState({ callbackTime: "", address: "", insurance: "" });
  const [leadStatus, setLeadStatus] = useState<Call["lead_status"]>("open");
  const [savingDetails, setSavingDetails] = useState(false);
  const [sendingStatusText, setSendingStatusText] = useState(false);
  const [qualifying, setQualifying] = useState(false);

  const qualifyFn = useServerFn(qualifyLead);
  const statusFn = useServerFn(updateLeadStatus);
  const detailFn = useServerFn(updateLeadDetails);
  const statusTextFn = useServerFn(sendLeadStatusText);
  const archiveFn = useServerFn(archiveLead);
  const restoreFn = useServerFn(restoreLead);
  const callbackFn = useServerFn(scheduleCallback);
  const assignFn = useServerFn(assignLead);

  const loadMessages = useCallback(async () => {
    if (!call || !open) return;
    const { data: t, error: threadError } = await supabase.from("sms_threads")
      .select("id")
      .eq("business_id", call.business_id)
      .eq("caller_number", call.caller_number)
      .maybeSingle();
    if (threadError) {
      console.warn("SMS thread refresh failed", threadError);
      return;
    }
    if (!t) {
      setThreadId(null);
      setMessages([]);
      return;
    }
    setThreadId(t.id);

    const { data, error } = await supabase
      .from("sms_messages")
      .select("id,direction,body,created_at")
      .eq("thread_id", t.id)
      .order("created_at");
    if (error) {
      console.warn("SMS message refresh failed", error);
      return;
    }
    setMessages(sortMessages((data ?? []) as Msg[]));
  }, [call?.business_id, call?.caller_number, open]);

  useEffect(() => {
    if (!call || !open) {
      setThreadId(null);
      setMessages([]);
      return;
    }
    setMessages([]);
    const q = call.qualification ?? {};
    setLeadStatus(call.lead_status);
    setDetails({
      callbackTime: q.callback_time ?? "",
      address: q.address ?? "",
      insurance: q.insurance_claim ?? "",
    });
    void loadMessages();
  }, [call?.id, open, loadMessages]);

  useEffect(() => {
    if (!call || !open) return;
    const refresh = () => void loadMessages();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const timer = window.setInterval(refresh, 12000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [call?.id, open, loadMessages]);

  useEffect(() => {
    if (!threadId || !open) return;
    const refresh = () => void loadMessages();
    const channel = supabase
      .channel(`sms:${threadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_messages", filter: `thread_id=eq.${threadId}` }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as Partial<Msg> | null)?.id;
          if (!id) {
            refresh();
            return;
          }
          setMessages((prev) => prev.filter((m) => m.id !== id));
          return;
        }

        const row = payload.new as Msg | null;
        if (!row?.id) {
          refresh();
          return;
        }
        setMessages((prev) => {
          const withoutMatchingTemp = prev.filter(
            (m) => !(m.id.startsWith("tmp-") && m.direction === row.direction && m.body === row.body),
          );
          const index = withoutMatchingTemp.findIndex((m) => m.id === row.id);
          if (index === -1) return sortMessages([...withoutMatchingTemp, row]);
          const next = [...withoutMatchingTemp];
          next[index] = row;
          return sortMessages(next);
        });
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          window.setTimeout(refresh, 750);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId, open, loadMessages]);

  if (!call) return null;
  const q = call.qualification ?? {};

  async function runQualify() {
    if (!call) return;
    setQualifying(true);
    try { await qualifyFn({ data: { callId: call.id } }); toast.success("Lead re-qualified"); }
    catch (e: any) { toast.error(e.message); }
    finally { setQualifying(false); }
  }

  async function setStatus(s: Call["lead_status"]) {
    if (!call) return;
    try {
      await statusFn({ data: { callId: call.id, status: s } });
      setLeadStatus(s);
      toast.success(`Status: ${STATUS_LABELS[s]}`);
    }
    catch (e: any) { toast.error(e.message); }
  }

  async function saveDetails() {
    if (!call) return;
    setSavingDetails(true);
    try {
      await detailFn({ data: { callId: call.id, ...details } });
      toast.success("Lead details saved");
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingDetails(false); }
  }

  async function sendStatusText(status: "scheduled" | "requesting_call" | "in_progress") {
    if (!call) return;
    setSendingStatusText(true);
    try {
      const r = await statusTextFn({ data: { callId: call.id, status } });
      setLeadStatus(status);
      toast.success(`${r.label} text sent`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSendingStatusText(false); }
  }

  async function archiveCurrent() {
    if (!call) return;
    try { await archiveFn({ data: { callId: call.id } }); toast.success("Resolved and archived"); }
    catch (e: any) { toast.error(e.message); }
  }

  async function restoreCurrent() {
    if (!call) return;
    try { await restoreFn({ data: { callId: call.id } }); toast.success("Lead restored"); }
    catch (e: any) { toast.error(e.message); }
  }

  async function autoAssign() {
    if (!call) return;
    try {
      const r: any = await assignFn({ data: { callId: call.id } });
      if (r.assigned) toast.success(`Assigned to ${r.member.name} (${r.role})`);
      else toast.info(r.reason ?? "No assignment");
    } catch (e: any) { toast.error(e.message); }
  }

  async function scheduleNow(type: "immediate" | "scheduled", when?: string) {
    if (!call) return;
    try {
      await callbackFn({ data: { callId: call.id, type, scheduledFor: when } });
      toast.success(type === "immediate" ? "Immediate callback queued" : "Callback scheduled");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {call.caller_name ?? "Unknown caller"}
            {call.priority === "high" && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">HIGH PRIORITY</span>}
          </SheetTitle>
          <SheetDescription>{call.caller_number} - {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground"><Sparkles className="h-3 w-3" /> AI summary</div>
          <p className="mt-2 text-sm">{call.ai_summary_short ?? call.ai_summary ?? "No summary yet."}</p>
          <Button variant="ghost" size="sm" className="mt-2 h-7" onClick={runQualify} disabled={qualifying}>
            {qualifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Re-qualify
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {[
            ["Service", q.service_needed],
            ["Urgency", call.urgency],
            ["Callback time", q.callback_time],
            ["Address", q.address],
            ["Insurance", q.insurance_claim],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="mt-0.5 truncate font-medium">{value || "-"}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Lead details</div>
              <p className="mt-1 text-xs text-muted-foreground">Edit the fields the AI captured from the call.</p>
            </div>
            <Button size="sm" variant="outline" onClick={saveDetails} disabled={savingDetails}>
              {savingDetails ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              value={details.callbackTime}
              onChange={(e) => setDetails((prev) => ({ ...prev, callbackTime: e.target.value }))}
              placeholder="Callback time"
            />
            <Input
              value={details.insurance}
              onChange={(e) => setDetails((prev) => ({ ...prev, insurance: e.target.value }))}
              placeholder="Insurance"
            />
            <Input
              className="sm:col-span-2"
              value={details.address}
              onChange={(e) => setDetails((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Address"
            />
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-muted-foreground">Lead status</span>
            {call.archived_at && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Archived</span>}
          </div>
          <Select value={leadStatus} onValueChange={(v) => setStatus(v as Call["lead_status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from(TEXTABLE_STATUSES).map((status) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={() => sendStatusText(status)}
                disabled={sendingStatusText}
              >
                {sendingStatusText ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send {STATUS_LABELS[status]} Text
              </Button>
            ))}
            {call.archived_at ? (
              <Button variant="outline" size="sm" onClick={restoreCurrent}>Restore lead</Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={archiveCurrent}>Mark resolved and archive</Button>
            )}
          </div>
        </div>

        <div className="mt-5">
          <span className="mb-2 block text-xs font-medium uppercase text-muted-foreground">Callback</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => scheduleNow("immediate")}><PhoneCall className="h-3.5 w-3.5" /> Call now</Button>
            <ScheduleInput onConfirm={(when) => scheduleNow("scheduled", when)} />
            <Button size="sm" variant="outline" onClick={autoAssign}><Sparkles className="h-3.5 w-3.5" /> Auto-assign</Button>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-muted-foreground">SMS thread</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5"
              onClick={() => sendStatusText("requesting_call")}
              disabled={sendingStatusText}
            >
              {sendingStatusText ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Request Call
            </Button>
          </div>
          <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-md border bg-muted/20 p-3">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground">No messages yet</p>
            ) : messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${m.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                  {m.body}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            This thread is read-only for CallRecover opt-in, status updates, and notification history.
            Direct staff replies from the system number are disabled for compliance.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ScheduleInput({ onConfirm }: { onConfirm: (iso: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-1.5">
      <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="h-9 w-44" />
      <Button size="sm" variant="outline" disabled={!value} onClick={() => onConfirm(new Date(value).toISOString())}>
        <Clock className="h-3.5 w-3.5" /> Schedule
      </Button>
    </div>
  );
}
