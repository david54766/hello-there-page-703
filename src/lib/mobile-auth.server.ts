import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Content-Type": "application/json",
};

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function requireMobileSupabase(request: Request) {
  const supabaseUrl = process.env.CALLRECOVER_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.CALLRECOVER_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase is not configured");
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  let userId = data.claims?.sub ?? null;
  if (error || !userId) {
    const fallback = await supabase.auth.getUser(token);
    userId = fallback.data.user?.id ?? null;
    if (fallback.error || !userId) {
      throw new Error("Invalid token");
    }
  }

  return { supabase, userId };
}

export async function getMobileBusinessId(supabase: any): Promise<string | null> {
  const { data } = await supabase.from("business_members").select("business_id").limit(1);
  return data?.[0]?.business_id ?? null;
}
