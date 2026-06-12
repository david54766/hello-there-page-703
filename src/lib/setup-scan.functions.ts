import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scanWebsiteForSetup } from "@/lib/setup-scan.server";

export const scanSetupWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ url: z.string().min(3).max(500) }).parse(input))
  .handler(async ({ data }) => scanWebsiteForSetup(data.url));
