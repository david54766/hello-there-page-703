import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { upsertTeamMember, deleteTeamMember } from "@/lib/dispatch.functions";
import { inviteTeamMemberLogin } from "@/lib/team-invites.functions";
import { loadViewerAccess, type ViewerAccess } from "@/lib/viewer-access";
import { Plus, Trash2, Edit3, Shield, Headphones, DollarSign, Users, Wrench, MailPlus, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/team")({ component: Team });

type Member = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  user_id: string | null;
  role: "all" | "emergency" | "office" | "sales" | "service";
  active: boolean;
};

const roleIcons = { all: Users, emergency: Shield, office: Headphones, sales: DollarSign, service: Wrench };
const roleLabel = {
  all: "All queues",
  emergency: "Emergency dispatch",
  office: "Office staff",
  sales: "Sales",
  service: "Service",
};

function Team() {
  const { user } = useAuth();
  const [bizId, setBizId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewerAccess | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [editing, setEditing] = useState<Partial<Member> | null>(null);
  const upsertFn = useServerFn(upsertTeamMember);
  const delFn = useServerFn(deleteTeamMember);
  const inviteFn = useServerFn(inviteTeamMemberLogin);

  async function load(b: string) {
    const { data } = await supabase.from("team_members").select("*").eq("business_id", b).order("created_at");
    setMembers((data ?? []) as Member[]);
  }

  useEffect(() => {
    if (!user) return;
    loadViewerAccess(supabase, user.id)
      .then((access) => {
        setViewer(access);
        if (!access?.businessId) return;
        setBizId(access.businessId);
        load(access.businessId);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load team access"));
  }, [user]);

  const canManageTeam = !!viewer?.canManageTenant;

  async function save() {
    if (!editing || !bizId) return;
    try {
      await upsertFn({ data: {
        id: editing.id,
        businessId: bizId,
        name: editing.name ?? "",
        phone: editing.phone ?? null,
        email: editing.email ?? null,
        role: (editing.role ?? "office") as Member["role"],
        active: editing.active ?? true,
      } });
      toast.success("Saved");
      setEditing(null);
      load(bizId);
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Remove this team member?")) return;
    try { await delFn({ data: { id } }); toast.success("Removed"); if (bizId) load(bizId); }
    catch (e: any) { toast.error(e.message); }
  }

  async function invite(member: Member) {
    if (!member.email) {
      toast.error("Add an email before inviting this team member.");
      return;
    }
    try {
      const result = await inviteFn({ data: { teamMemberId: member.id } });
      if (result.alreadyLinked) {
        toast.success("This team member already has login access.");
        return;
      }
      if (result.emailSent) {
        toast.success(`Invite sent to ${member.email}`);
        return;
      }
      if (result.inviteUrl) {
        await navigator.clipboard?.writeText(result.inviteUrl).catch(() => undefined);
        toast.success("Invite link created and copied.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send invite");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Team & dispatch</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canManageTeam ? "Leads route round-robin to active members in each role." : "Your team's routing list. Only admins can make changes."}
          </p>
        </div>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          {canManageTeam && (
            <DialogTrigger asChild>
              <Button onClick={() => setEditing({ role: "office", active: true })}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit member" : "Add team member"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing!, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={editing?.phone ?? ""} onChange={(e) => setEditing({ ...editing!, phone: e.target.value })} placeholder="+1…" /></div>
              <div><Label>Email</Label><Input type="email" value={editing?.email ?? ""} onChange={(e) => setEditing({ ...editing!, email: e.target.value })} /></div>
              <div>
                <Label>Role</Label>
                <Select value={editing?.role ?? "office"} onValueChange={(v) => setEditing({ ...editing!, role: v as Member["role"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All queues</SelectItem>
                    <SelectItem value="emergency">Emergency dispatch</SelectItem>
                    <SelectItem value="office">Office staff</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">Active (receives leads)</span>
                <Switch checked={editing?.active ?? true} onCheckedChange={(v) => setEditing({ ...editing!, active: v })} />
              </div>
              <Button className="w-full" onClick={save}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {members.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No team members yet. Add your first to start auto-dispatching leads.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const Icon = roleIcons[m.role];
            return (
              <Card key={m.id} className="flex items-center justify-between p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${m.role === "emergency" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{m.name}</span>
                      {!m.active && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">paused</span>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{roleLabel[m.role]} · {m.phone ?? m.email ?? "no contact"}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {canManageTeam ? (
                    <>
                      {!m.user_id && (
                        <Button variant="ghost" size="icon" onClick={() => invite(m)} title="Invite login">
                          <MailPlus className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setEditing(m)}><Edit3 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" /> Read only
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
