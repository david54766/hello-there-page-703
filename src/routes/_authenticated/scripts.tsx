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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagPicker } from "@/components/tag-picker";
import { CONTRACTOR_TYPES } from "@/lib/contractor-data";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scripts")({ component: ScriptsPage });

const KIND_LABELS: Record<string, string> = {
  first_message: "First Message",
  system: "Virtual Agent Behavior",
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
  const [draft, setDraft] = useState<{ contractor_type: string; kind: "system" | "first_message"; label: string; body: string }>({ contractor_type: "any", kind: "first_message", label: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const reload = async (filters = { contractorType: contractorFilter, kind: kindFilter }) => {
    const { templates } = await fetchTemplates({
      data: {
        contractorType: filters.contractorType === "all" ? undefined : filters.contractorType,
        kind: filters.kind === "all" ? undefined : filters.kind as "system" | "first_message",
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
      setDraft({ contractor_type: contractorFilter === "all" ? "any" : contractorFilter, kind: "first_message", label: "", body: "" });
      await reload();
      setTemplateOpen(false);
      toast.success("Template saved");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Script library</h1>
          <p className="mt-2 text-sm text-muted-foreground">Reusable first messages and internal virtual agent behavior. Your profile trade is selected automatically.</p>
        </div>
        <Button onClick={() => setTemplateOpen(true)} className="sm:mt-1">
          <Plus className="h-4 w-4" /> New template
        </Button>
      </div>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
            <DialogDescription>Create a caller-facing first message or internal virtual agent behavior.</DialogDescription>
          </DialogHeader>
        <div className="space-y-3">
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
                <SelectItem value="first_message">First Message</SelectItem>
                <SelectItem value="system">Virtual Agent Behavior</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              First Message is caller-facing. Virtual Agent Behavior is internal instruction text.
            </p>
          </div>
        </div>
        <div>
          <Label className="text-xs">Template Label</Label>
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. Friendly receptionist" maxLength={120} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label className="text-xs">{draft.kind === "system" ? "Internal Behavior Instructions" : "Caller-Facing Message"}</Label>
            <TagPicker value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} />
          </div>
          <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={6} maxLength={8000} placeholder="Use {business}, {website}, {book_consult}…" />
          {draft.kind === "system" && (
            <p className="mt-1 text-xs text-muted-foreground">
              These instructions shape the virtual agent's behavior and are not read verbatim to callers.
            </p>
          )}
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Save Template
        </Button>
        </div>
        </DialogContent>
      </Dialog>

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
              <SelectItem value="first_message">First Message</SelectItem>
              <SelectItem value="system">Virtual Agent Behavior</SelectItem>
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
              {t.kind === "system" ? (
                <details className="rounded bg-muted/30 p-2 text-xs">
                  <summary className="cursor-pointer font-medium text-muted-foreground">View internal behavior instructions</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">{t.body}</pre>
                </details>
              ) : (
                <pre className="whitespace-pre-wrap break-words rounded bg-muted/30 p-2 font-mono text-xs">{t.body}</pre>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
