import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { qualifyLead, suggestReplies, updateLeadStatus, scheduleCallback } from "@/lib/leads.functions";
import { toast } from "sonner";
import { Sparkles, Send, PhoneCall, Clock, Loader2 } from "lucide-react";
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
  created_at: string;
};

type Msg = { id: string; direction: string; body: string; created_at: string };

export function LeadDrawer({ call, open, onOpenChange }: { call: Call | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [qualifying, setQualifying] = useState(false);

  const qualifyFn = useServerFn(qualifyLead);
  const suggestFn = useServerFn(suggestReplies);
  const statusFn = useServerFn(updateLeadStatus);
  const callbackFn = useServerFn(scheduleCallback);

  useEffect(() => {
    if (!call) return;
    setMessages([]); setSuggested([]); setDraft("");
    supabase.from("sms_threads")
      .select("id")
      .eq("business_id", call.business_id)
      .eq("caller_number", call.caller_number)
      .maybeSingle()
      .then(({ data: t }) => {
        if (!t) return;
        supabase.from("sms_messages").select("id,direction,body,created_at").eq("thread_id", t.id).order("created_at").then(({ data }) => setMessages((data ?? []) as Msg[]));
      });
  }, [call]);

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

  async function sendDraft() {
    if (!call || !draft.trim()) return;
    toast.info("SMS queued (Twilio not connected yet)");
    setDraft("");
  }

  async function setStatus(s: Call["lead_status"]) {
    if (!call) return;
    try { await statusFn({ data: { callId: call.id, status: s } }); toast.success(`Status: ${s}`); }
    catch (e: any) { toast.error(e.message); }
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
          <SheetDescription>{call.caller_number} · {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}</SheetDescription>
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
              <div className="mt-0.5 truncate font-medium">{value || "—"}</div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-muted-foreground">Lead status</span>
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
        </div>

        <div className="mt-5">
          <span className="mb-2 block text-xs font-medium uppercase text-muted-foreground">Callback</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => scheduleNow("immediate")}><PhoneCall className="h-3.5 w-3.5" /> Call now</Button>
            <ScheduleInput onConfirm={(when) => scheduleNow("scheduled", when)} />
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-muted-foreground">SMS thread</span>
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
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-muted-foreground">Suggested replies</span>
            <Button variant="ghost" size="sm" className="h-7" onClick={getSuggestions} disabled={loadingSugg}>
              {loadingSugg ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Generate
            </Button>
          </div>
          <div className="space-y-1.5">
            {suggested.length === 0 ? (
              <p className="text-xs text-muted-foreground">Click Generate for AI suggestions.</p>
            ) : suggested.map((s, i) => (
              <button key={i} onClick={() => setDraft(s)} className="block w-full rounded-md border bg-card px-3 py-2 text-left text-sm hover:bg-accent">
                {s}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a reply…" />
            <Button onClick={sendDraft} disabled={!draft.trim()}><Send className="h-3.5 w-3.5" /></Button>
          </div>
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