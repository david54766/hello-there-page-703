export type ViewerRole = "admin" | "staff" | "agent";

export type ViewerAccess = {
  businessId: string;
  business: any;
  role: ViewerRole;
  isAgent: boolean;
  canManageTenant: boolean;
  teamMemberId: string | null;
  teamMember: any | null;
};

function pickRole(roles: string[]): ViewerRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("staff")) return "staff";
  return "agent";
}

export async function loadViewerAccess(supabase: any, userId: string): Promise<ViewerAccess | null> {
  const { data: memberships, error: membershipError } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;
  const membershipRows = memberships ?? [];
  if (membershipRows.length === 0) return null;

  const businessIds = membershipRows.map((row: any) => row.business_id).filter(Boolean);
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("business_id, role")
    .eq("user_id", userId)
    .in("business_id", businessIds);
  if (rolesError) throw rolesError;

  const roleRows = roles ?? [];
  const businessId =
    roleRows.find((row: any) => row.role === "admin")?.business_id ??
    roleRows.find((row: any) => row.role === "staff")?.business_id ??
    roleRows.find((row: any) => row.role === "agent")?.business_id ??
    businessIds[0];

  const businessRoles = roleRows
    .filter((row: any) => row.business_id === businessId)
    .map((row: any) => row.role as string);
  const role = pickRole(businessRoles);

  const [{ data: business, error: businessError }, { data: teamMember, error: teamError }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
    supabase.from("team_members").select("*").eq("business_id", businessId).eq("user_id", userId).maybeSingle(),
  ]);
  if (businessError) throw businessError;
  if (teamError) throw teamError;

  return {
    businessId,
    business,
    role,
    isAgent: role === "agent",
    canManageTenant: role === "admin" || role === "staff",
    teamMemberId: teamMember?.id ?? null,
    teamMember: teamMember ?? null,
  };
}
