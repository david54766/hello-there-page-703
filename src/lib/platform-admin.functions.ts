import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type TenantSummary = {
  id: string;
  businessName: string;
  contractorType: string | null;
  businessPhone: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
  vapiNumber: string | null;
  assistantConnected: boolean;
  memberCount: number;
  teamCount: number;
  callCount: number;
  openLeadCount: number;
  recoveredCallCount: number;
  archivedLeadCount: number;
  appointmentCount: number;
  smsConsentCount: number;
  estimatedRevenue: number;
};

type TenantTotals = {
  tenants: number;
  calls: number;
  openLeads: number;
  recoveredCalls: number;
  appointments: number;
  estimatedRevenue: number;
};

const admin = supabaseAdmin as any;

function countByBusiness(rows: any[], key: string, predicate?: (row: any) => boolean) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (predicate && !predicate(row)) continue;
    const businessId = row[key];
    if (!businessId) continue;
    counts.set(businessId, (counts.get(businessId) ?? 0) + 1);
  }
  return counts;
}

async function assertPlatformAdmin(userId: string) {
  const { data, error } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Unable to verify platform admin access: ${error.message}`);
  if (!data?.user_id) throw new Error("Not authorized for platform admin access.");
}

async function selectTenantRows(table: string, columns: string, businessIds: string[]) {
  if (!businessIds.length) return [];
  const { data, error } = await admin.from(table).select(columns).in("business_id", businessIds);
  if (error) throw new Error(`Unable to load ${table}: ${error.message}`);
  return data ?? [];
}

async function loadOwnerEmails(ownerIds: string[]) {
  const emails = new Map<string, string>();
  const uniqueIds = Array.from(new Set(ownerIds.filter(Boolean)));

  for (let i = 0; i < uniqueIds.length; i += 50) {
    const chunk = uniqueIds.slice(i, i + 50);
    const users = await Promise.all(
      chunk.map(async (id) => {
        try {
          const { data, error } = await admin.auth.admin.getUserById(id);
          if (error) return null;
          return data?.user ?? null;
        } catch {
          return null;
        }
      }),
    );

    for (const user of users) {
      if (user?.id && user.email) emails.set(user.id, user.email);
    }
  }

  return emails;
}

export const getPlatformAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.userId);

    const { data: businesses, error: businessesError } = await admin
      .from("businesses")
      .select("id, owner_id, business_name, contractor_type, business_phone, owner_phone, avg_job_value, onboarding_complete, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (businessesError) throw new Error(`Unable to load tenants: ${businessesError.message}`);

    const tenantRows = businesses ?? [];
    const businessIds = tenantRows.map((business: any) => business.id).filter(Boolean);

    const [
      members,
      teamMembers,
      calls,
      appointments,
      consents,
      assistants,
      ownerEmails,
    ] = await Promise.all([
      selectTenantRows("business_members", "business_id, user_id", businessIds),
      selectTenantRows("team_members", "business_id, active", businessIds),
      selectTenantRows("calls", "business_id, lead_status, archived_at", businessIds),
      selectTenantRows("appointments", "business_id, status", businessIds),
      selectTenantRows("sms_consents", "business_id, status", businessIds),
      selectTenantRows("vapi_number_assistants", "business_id, phone_number, assistant_id", businessIds),
      loadOwnerEmails(tenantRows.map((business: any) => business.owner_id).filter(Boolean)),
    ]);

    const memberCounts = countByBusiness(members, "business_id");
    const teamCounts = countByBusiness(teamMembers, "business_id", (row) => row.active !== false);
    const callCounts = countByBusiness(calls, "business_id");
    const openCounts = countByBusiness(calls, "business_id", (row) => row.lead_status === "open" && !row.archived_at);
    const recoveredCounts = countByBusiness(calls, "business_id", (row) => row.lead_status !== "open");
    const archivedCounts = countByBusiness(calls, "business_id", (row) => Boolean(row.archived_at));
    const appointmentCounts = countByBusiness(appointments, "business_id", (row) => row.status !== "cancelled");
    const consentCounts = countByBusiness(consents, "business_id", (row) => row.status === "opted_in");
    const assistantByBusiness = new Map<string, any>();
    for (const assistant of assistants) {
      if (!assistantByBusiness.has(assistant.business_id)) assistantByBusiness.set(assistant.business_id, assistant);
    }

    const tenants: TenantSummary[] = tenantRows.map((business: any) => {
      const recoveredCallCount = recoveredCounts.get(business.id) ?? 0;
      const estimatedRevenue = recoveredCallCount * (business.avg_job_value ?? 500);
      const assistant = assistantByBusiness.get(business.id);

      return {
        id: business.id,
        businessName: business.business_name ?? "Unnamed business",
        contractorType: business.contractor_type ?? null,
        businessPhone: business.business_phone ?? null,
        ownerPhone: business.owner_phone ?? null,
        ownerEmail: ownerEmails.get(business.owner_id) ?? null,
        onboardingComplete: Boolean(business.onboarding_complete),
        createdAt: business.created_at,
        updatedAt: business.updated_at,
        vapiNumber: assistant?.phone_number ?? null,
        assistantConnected: Boolean(assistant?.assistant_id),
        memberCount: memberCounts.get(business.id) ?? 0,
        teamCount: teamCounts.get(business.id) ?? 0,
        callCount: callCounts.get(business.id) ?? 0,
        openLeadCount: openCounts.get(business.id) ?? 0,
        recoveredCallCount,
        archivedLeadCount: archivedCounts.get(business.id) ?? 0,
        appointmentCount: appointmentCounts.get(business.id) ?? 0,
        smsConsentCount: consentCounts.get(business.id) ?? 0,
        estimatedRevenue,
      };
    });

    const totals: TenantTotals = tenants.reduce(
      (acc, tenant) => ({
        tenants: acc.tenants + 1,
        calls: acc.calls + tenant.callCount,
        openLeads: acc.openLeads + tenant.openLeadCount,
        recoveredCalls: acc.recoveredCalls + tenant.recoveredCallCount,
        appointments: acc.appointments + tenant.appointmentCount,
        estimatedRevenue: acc.estimatedRevenue + tenant.estimatedRevenue,
      }),
      { tenants: 0, calls: 0, openLeads: 0, recoveredCalls: 0, appointments: 0, estimatedRevenue: 0 },
    );

    return { isPlatformAdmin: true, totals, tenants };
  });
