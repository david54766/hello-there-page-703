import { getFirstServerEnv } from "@/lib/env.server";

type SchedulingProvider = "internal" | "hcp" | "jobber";

type AppointmentPayload = {
  id: string;
  scheduled_for: string;
  duration_minutes?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  service?: string | null;
  notes?: string | null;
};

type BusinessPayload = {
  business_name?: string | null;
  business_phone?: string | null;
  scheduling_provider?: SchedulingProvider | null;
  hcp_api_key?: string | null;
  jobber_refresh_token?: string | null;
};

type SyncInput = {
  supabase: any;
  businessId: string;
  business: BusinessPayload | null | undefined;
  appointment: AppointmentPayload;
  teamMemberName?: string | null;
};

export type ExternalScheduleSyncResult = {
  provider: SchedulingProvider;
  ok: boolean;
  providerRef?: string | null;
  externalUrl?: string | null;
  error?: string;
  skipped?: string;
};

function selectedProvider(business: BusinessPayload | null | undefined): SchedulingProvider {
  const provider = business?.scheduling_provider;
  return provider === "hcp" || provider === "jobber" ? provider : "internal";
}

function appointmentEnd(appointment: AppointmentPayload) {
  const start = new Date(appointment.scheduled_for);
  const duration = appointment.duration_minutes ?? 60;
  return new Date(start.getTime() + duration * 60_000).toISOString();
}

function splitName(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "CallRecover", lastName: "Lead" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Lead" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function providerNotes(input: SyncInput) {
  const bits = [
    "Created by CallRecover.",
    input.appointment.service ? `Service: ${input.appointment.service}` : null,
    input.teamMemberName ? `Assigned team member: ${input.teamMemberName}` : null,
    input.appointment.customer_phone ? `Customer phone: ${input.appointment.customer_phone}` : null,
    input.appointment.notes ? `Notes: ${input.appointment.notes}` : null,
  ].filter(Boolean);
  return bits.join("\n");
}

async function safeJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function providerError(payload: unknown, fallback: string) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload.slice(0, 500) || fallback;
  const value = payload as any;
  const message =
    value.message ??
    value.error ??
    value.error_description ??
    value.errors?.[0]?.message ??
    value.userErrors?.[0]?.message;
  return typeof message === "string" && message ? message : fallback;
}

async function syncHousecallPro(input: SyncInput): Promise<ExternalScheduleSyncResult> {
  const apiKey = input.business?.hcp_api_key?.trim();
  if (!apiKey) {
    return {
      provider: "hcp",
      ok: false,
      skipped: "missing_hcp_api_key",
      error: "Housecall Pro API key is not configured for this business.",
    };
  }

  const { firstName, lastName } = splitName(input.appointment.customer_name);
  const body = {
    customer: {
      first_name: firstName,
      last_name: lastName,
      mobile_number: input.appointment.customer_phone ?? undefined,
    },
    scheduled_start: input.appointment.scheduled_for,
    scheduled_end: appointmentEnd(input.appointment),
    description: input.appointment.service ?? "CallRecover appointment",
    notes: providerNotes(input),
    tags: ["CallRecover"],
  };

  const response = await fetch("https://api.housecallpro.com/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await safeJson(response);
  if (!response.ok) {
    return {
      provider: "hcp",
      ok: false,
      error: providerError(payload, `Housecall Pro returned ${response.status}`),
    };
  }

  const value = payload as any;
  const providerRef = value?.id ?? value?.job?.id ?? value?.data?.id ?? null;
  return {
    provider: "hcp",
    ok: true,
    providerRef,
    externalUrl: value?.web_url ?? value?.job?.web_url ?? value?.data?.web_url ?? null,
  };
}

async function getJobberAccessToken(input: SyncInput) {
  const refreshToken = input.business?.jobber_refresh_token?.trim();
  if (!refreshToken) throw new Error("Jobber refresh token is not configured for this business.");

  const clientId = getFirstServerEnv(["JOBBER_CLIENT_ID", "CALLRECOVER_JOBBER_CLIENT_ID"]);
  const clientSecret = getFirstServerEnv(["JOBBER_CLIENT_SECRET", "CALLRECOVER_JOBBER_CLIENT_SECRET"]);
  if (!clientId || !clientSecret) {
    throw new Error("Jobber client ID/secret are not configured in server secrets.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://api.getjobber.com/api/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(providerError(payload, `Jobber token refresh returned ${response.status}`));

  const tokenPayload = payload as { access_token?: string; refresh_token?: string };
  if (!tokenPayload.access_token) throw new Error("Jobber did not return an access token.");
  if (tokenPayload.refresh_token && tokenPayload.refresh_token !== refreshToken) {
    await input.supabase
      .from("businesses")
      .update({ jobber_refresh_token: tokenPayload.refresh_token })
      .eq("id", input.businessId);
  }
  return tokenPayload.access_token;
}

async function syncJobber(input: SyncInput): Promise<ExternalScheduleSyncResult> {
  let accessToken: string;
  try {
    accessToken = await getJobberAccessToken(input);
  } catch (error) {
    return {
      provider: "jobber",
      ok: false,
      skipped: "missing_jobber_credentials",
      error: error instanceof Error ? error.message : "Jobber credentials are not configured.",
    };
  }

  const { firstName, lastName } = splitName(input.appointment.customer_name);
  const mutation = `
    mutation CallRecoverClientCreate($input: ClientCreateInput!) {
      clientCreate(input: $input) {
        client {
          id
          jobberWebUri
        }
        userErrors {
          message
          path
        }
      }
    }
  `;
  const variables = {
    input: {
      firstName,
      lastName,
      companyName: input.business?.business_name ?? undefined,
      phones: input.appointment.customer_phone
        ? [{ description: "MAIN", primary: true, number: input.appointment.customer_phone }]
        : undefined,
    },
  };

  const response = await fetch("https://api.getjobber.com/api/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: mutation, variables }),
  });
  const payload = await safeJson(response);
  if (!response.ok) {
    return {
      provider: "jobber",
      ok: false,
      error: providerError(payload, `Jobber returned ${response.status}`),
    };
  }

  const value = payload as any;
  const userErrors = value?.data?.clientCreate?.userErrors ?? value?.errors;
  if (Array.isArray(userErrors) && userErrors.length > 0) {
    return {
      provider: "jobber",
      ok: false,
      error: providerError({ userErrors }, "Jobber rejected the appointment sync."),
    };
  }

  const client = value?.data?.clientCreate?.client;
  return {
    provider: "jobber",
    ok: true,
    providerRef: client?.id ?? null,
    externalUrl: client?.jobberWebUri ?? null,
  };
}

export async function syncExternalAppointment(input: SyncInput): Promise<ExternalScheduleSyncResult> {
  const provider = selectedProvider(input.business);
  if (provider === "internal") return { provider, ok: true, skipped: "internal" };

  try {
    if (provider === "hcp") return await syncHousecallPro(input);
    return await syncJobber(input);
  } catch (error) {
    return {
      provider,
      ok: false,
      error: error instanceof Error ? error.message : "External scheduling sync failed.",
    };
  }
}
