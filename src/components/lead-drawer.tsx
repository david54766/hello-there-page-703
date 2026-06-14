import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { archiveLead, qualifyLead, restoreLead, suggestReplies, updateLeadStatus, scheduleCallback } from "@/lib/leads.functions";
import { assignLead } from "@/lib/dispatch.functions";
import { toast } from "sonner";
import { Sparkles, MessageSquareText, PhoneCall, Clock, Loader2 } from "lucide-react";
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
  lead_status: "open" | "contacted" | "scheduled" | "closed";
  qualification: Record<string, string> | null;
  callback_requested: boolean;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
};

type Msg = { id: string; direction: string; body: string; created_at: string };

function sortMessages(items: Msg[]) {
  return [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function LeadDrawer({ call, open, onOpenChange }: { call: Call | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [qualifying, setQualifying] = useState(false);

  const qualifyFn = useServerFn(qualifyLead);
  const suggestFn = useServerFn(suggestReplies);
  const statusFn = useServerFn(updateLeadStatus);
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
    setSuggested([]);
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

  async function getSuggestions() {
    if (!call) return;
    setLoadingSugg(true);
    try {
      const r = await suggestFn({ data: { callId: call.id } });
      setSuggested(r.replies);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingSugg(false); }
  }

  function openNativeSms(body?: string) {
    if (!call?.caller_number) return;
    const bodyText = body?.trim();
    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
    const suffix = bodyText ? `${isIOS ? "&" : "?"}body=${encodeURIComponent(bodyText)}` : "";
    window.location.href = `sms:${call.caller_number}${suffix}`;
  }

  async function setStatus(s: Call["lead_status"]) {
    if (!call) return;
    try { await statusFn({ data: { callId: call.id, status: s } }); toast.success(`Status: ${s}`); }
    catch (e: any) { toast.error(e.message); }
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

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-muted-foreground">Lead status</span>
            {call.archived_at && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Archived</span>}
          </div>
          <Select value={call.lead_status} onValueChange={(v) => setStatus(v as Call["lead_status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <div className="mt-2">
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
            <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={() => openNativeSms()}>
              <MessageSquareText className="h-3.5 w-3.5" />
              Text from device
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
            This thread is read-only for CallRecover system notifications and consent history.
            Use the assigned staff member's own phone to text the caller directly.
          </p>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-muted-foreground">Native SMS prompts</span>
            <Button variant="ghost" size="sm" className="h-7" onClick={getSuggestions} disabled={loadingSugg}>
              {loadingSugg ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Generate
            </Button>
          </div>
          <div className="space-y-1.5">
            {suggested.length === 0 ? (
              <p className="text-xs text-muted-foreground">Click Generate for optional wording, then send it from the staff member's own SMS app.</p>
            ) : suggested.map((s, i) => (
              <button key={i} onClick={() => openNativeSms(s)} className="block w-full rounded-md border bg-card px-3 py-2 text-left text-sm hover:bg-accent">
                <span className="block">{s}</span>
                <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Open native SMS</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            CallRecover's Twilio number is reserved for opt-in and automated transactional messages.
            Staff follow-up texts should come from the assigned team member's own phone.
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
