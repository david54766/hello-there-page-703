import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listScriptTemplates, upsertScriptTemplate, deleteScriptTemplate } from "@/lib/scripts.functions";
import { getBusinessForTags } from "@/lib/schedule.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagPicker } from "@/components/tag-picker";
import { CONTRACTOR_TYPES } from "@/lib/contractor-data";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scripts")({ component: ScriptsPage });

const KIND_LABELS: Record<string, string> = {
  hello: "Greeting",
  first_message: "First Message",
  system: "System Prompt",
};

function contractorLabel(value?: string | null) {
  if (!value) return "Any Trade";
  return CONTRACTOR_TYPES.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function kindLabel(value: string) {
  return KIND_LABELS[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ScriptsPage() {
  const fetchTemplates = useServerFn(listScriptTemplates);
  const fetchBusiness = useServerFn(getBusinessForTags);
  const upsert = useServerFn(upsertScriptTemplate);
  const remove = useServerFn(deleteScriptTemplate);

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractorFilter, setContractorFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [draft, setDraft] = useState<{ contractor_type: string; kind: "hello" | "system" | "first_message"; label: string; body: string }>({ contractor_type: "any", kind: "system", label: "", body: "" });
  const [saving, setSaving] = useState(false);

  const reload = async (filters = { contractorType: contractorFilter, kind: kindFilter }) => {
    const { templates } = await fetchTemplates({
      data: {
        contractorType: filters.contractorType === "all" ? undefined : filters.contractorType,
        kind: filters.kind === "all" ? undefined : filters.kind as "hello" | "system" | "first_message",
      },
    });
    setTemplates(templates);
  };

  useEffect(() => {
    (async () => {
      const [{ business }] = await Promise.all([
        fetchBusiness({ data: undefined as any }),
      ]);
      const profileType = business?.contractor_type || "all";
      setContractorFilter(profileType);
      setDraft((prev) => ({ ...prev, contractor_type: profileType === "all" ? "any" : profileType }));
      await reload({ contractorType: profileType, kind: "all" });
      setLoading(false);
    })();
    /* eslint-disable-next-line */
  }, []);

  useEffect(() => {
    if (!loading) reload();
    /* eslint-disable-next-line */
  }, [contractorFilter, kindFilter]);

  const save = async () => {
    if (!draft.label || !draft.body) { toast.error("Label and body required"); return; }
    setSaving(true);
    try {
      await upsert({ data: { contractorType: draft.contractor_type === "any" ? undefined : draft.contractor_type, kind: draft.kind, label: draft.label, body: draft.body } });
      setDraft({ contractor_type: contractorFilter === "all" ? "any" : contractorFilter, kind: "system", label: "", body: "" });
      await reload();
      toast.success("Template saved");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">Script library</h1>
      <p className="mb-6 text-sm text-muted-foreground">Reusable greetings, first messages and full system prompts. Your profile trade is selected automatically.</p>

      <Card className="mb-6 space-y-3 p-5">
        <div className="text-sm font-semibold">New template</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Contractor Type</Label>
            <Select value={draft.contractor_type} onValueChange={(v) => setDraft({ ...draft, contractor_type: v })}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Trade</SelectItem>
                {CONTRACTOR_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Template Type</Label>
            <Select value={draft.kind} onValueChange={(v: any) => setDraft({ ...draft, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hello">Greeting</SelectItem>
                <SelectItem value="first_message">First Message</SelectItem>
                <SelectItem value="system">System Prompt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Template Label</Label>
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. Friendly receptionist" maxLength={120} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label className="text-xs">Script Body</Label>
            <TagPicker value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} />
          </div>
          <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={6} maxLength={8000} placeholder="Use {business}, {website}, {book_consult}…" />
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Save Template
        </Button>
      </Card>

      <Card className="mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">View Business Type</Label>
          <Select value={contractorFilter} onValueChange={setContractorFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Business Types</SelectItem>
              {CONTRACTOR_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">View Template Type</Label>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Template Types</SelectItem>
              <SelectItem value="hello">Greeting</SelectItem>
              <SelectItem value="first_message">First Message</SelectItem>
              <SelectItem value="system">System Prompt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : templates.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">No templates match this view.</Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{kindLabel(t.kind)} · {contractorLabel(t.contractor_type)}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={async () => { await remove({ data: { id: t.id } }); await reload(); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <pre className="whitespace-pre-wrap break-words rounded bg-muted/30 p-2 font-mono text-xs">{t.body}</pre>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
