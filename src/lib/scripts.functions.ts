import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getBusinessId(supabase: any): Promise<string | null> {
  const { data } = await supabase.from("business_members").select("business_id").limit(1);
  return data?.[0]?.business_id ?? null;
}

export const listScriptTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      contractorType: z.string().max(50).optional(),
      kind: z.enum(["hello", "system", "first_message"]).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await getBusinessId(context.supabase);
    if (!businessId) return { templates: [] };
    let q = context.supabase
      .from("script_templates")
      .select("*")
      .eq("business_id", businessId)
      .order("contractor_type", { ascending: true })
      .order("label", { ascending: true });
    if (data.contractorType) q = q.eq("contractor_type", data.contractorType);
    if (data.kind) q = q.eq("kind", data.kind);
    const { data: rows } = await q;
    return { templates: rows ?? [] };
  });

export const upsertScriptTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid().optional(),
      contractorType: z.string().max(50).nullable().optional(),
      kind: z.enum(["hello", "system", "first_message"]),
      label: z.string().min(1).max(120),
      body: z.string().min(1).max(8000),
      isDefault: z.boolean().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await getBusinessId(context.supabase);
    if (!businessId) throw new Error("No business found");
    const row = {
      id: data.id,
      business_id: businessId,
      contractor_type: data.contractorType ?? null,
      kind: data.kind,
      label: data.label,
      body: data.body,
      is_default: data.isDefault ?? false,
    };
    const { data: saved, error } = await context.supabase
      .from("script_templates")
      .upsert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { template: saved };
  });

export const deleteScriptTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("script_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });