import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listVapiAssistants, listVapiPhoneNumbers, createVapiCall } from "@/lib/vapi.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/vapi")({ component: VapiPage });

function VapiPage() {
  const fetchAssistants = useServerFn(listVapiAssistants);
  const fetchNumbers = useServerFn(listVapiPhoneNumbers);
  const startCall = useServerFn(createVapiCall);

  const [assistants, setAssistants] = useState<{ id: string; name: string }[]>([]);
  const [numbers, setNumbers] = useState<{ id: string; number: string; name: string }[]>([]);
  const [assistantId, setAssistantId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [customer, setCustomer] = useState("");
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    Promise.all([fetchAssistants(), fetchNumbers()])
      .then(([a, n]) => { setAssistants(a.assistants); setNumbers(n.numbers); })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [fetchAssistants, fetchNumbers]);

  const placeCall = async () => {
    if (!assistantId || !phoneNumberId || !customer) { toast.error("Pick an assistant, a number, and enter a destination"); return; }
    setCalling(true);
    try {
      await startCall({ data: { assistantId, phoneNumberId, customerNumber: customer } });
      toast.success("Call initiated");
    } catch (e: any) { toast.error(e.message); }
    finally { setCalling(false); }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">Vapi · outbound test call</h1>
      <p className="mb-6 text-sm text-muted-foreground">Trigger a real phone call from your Vapi number to any destination. Call forwarding rules are configured inside the Vapi assistant.</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading Vapi resources…</p>
      ) : (
        <Card className="space-y-4 p-5">
          <div>
            <Label>Assistant</Label>
            <Select value={assistantId} onValueChange={setAssistantId}>
              <SelectTrigger><SelectValue placeholder={assistants.length ? "Pick an assistant" : "No assistants found"} /></SelectTrigger>
              <SelectContent>
                {assistants.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>From (your Vapi number)</Label>
            <Select value={phoneNumberId} onValueChange={setPhoneNumberId}>
              <SelectTrigger><SelectValue placeholder={numbers.length ? "Pick a number" : "No numbers configured in Vapi"} /></SelectTrigger>
              <SelectContent>
                {numbers.map((n) => <SelectItem key={n.id} value={n.id}>{n.number} {n.name && `· ${n.name}`}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Destination number (E.164)</Label>
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="+15551234567" />
          </div>

          <Button onClick={placeCall} disabled={calling} className="w-full sm:w-auto">
            {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />} Place call
          </Button>
        </Card>
      )}
    </div>
  );
}