type FirebaseConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

type PushPayload = {
  businessId: string;
  callId?: string | null;
  title: string;
  body?: string | null;
  data?: Record<string, string | null | undefined>;
};

type PushTokenRow = {
  id: string;
  token: string;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function getEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function getFirebaseConfig(): FirebaseConfig | null {
  const projectId = getEnv("CALLRECOVER_FIREBASE_PROJECT_ID") || getEnv("FIREBASE_PROJECT_ID");
  const clientEmail = getEnv("CALLRECOVER_FIREBASE_CLIENT_EMAIL") || getEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = (getEnv("CALLRECOVER_FIREBASE_PRIVATE_KEY") || getEnv("FIREBASE_PRIVATE_KEY")).replace(
    /\\n/g,
    "\n",
  );

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

function base64Url(input: string | ArrayBuffer) {
  const binary =
    typeof input === "string"
      ? input
      : Array.from(new Uint8Array(input), (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return bytes.buffer;
}

async function signJwt(config: FirebaseConfig) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: config.clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claimSet))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(config.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64Url(signature)}`;
}

async function getAccessToken(config: FirebaseConfig) {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const assertion = await signJwt(config);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const payload = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error || "Firebase access token request failed");
  }

  cachedAccessToken = {
    token: payload.access_token,
    expiresAt: Date.now() + Math.max(300, payload.expires_in ?? 3600) * 1000,
  };
  return cachedAccessToken.token;
}

function stringData(data: PushPayload["data"]) {
  return Object.fromEntries(
    Object.entries(data ?? {})
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0)
      .map(([key, value]) => [key, value]),
  );
}

function isInvalidTokenError(error: any) {
  const details = Array.isArray(error?.details) ? error.details : [];
  const errorCode = details.find((item: any) => item?.errorCode)?.errorCode;
  return error?.status === "NOT_FOUND" || errorCode === "UNREGISTERED";
}

export async function sendMobilePushForNotification(supabase: any, payload: PushPayload) {
  const config = getFirebaseConfig();
  if (!config) return { skipped: "firebase_not_configured", sent: 0, failed: 0 };

  try {
    const { data: tokens, error } = await supabase
      .from("mobile_push_tokens" as any)
      .select("id, token")
      .eq("business_id", payload.businessId)
      .is("disabled_at", null)
      .limit(100);

    if (error) return { skipped: error.message, sent: 0, failed: 0 };

    const activeTokens = (tokens ?? []) as PushTokenRow[];
    if (!activeTokens.length) return { skipped: "no_tokens", sent: 0, failed: 0 };

    const accessToken = await getAccessToken(config);
    let sent = 0;
    let failed = 0;

    await Promise.all(
      activeTokens.map(async (row) => {
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: row.token,
              notification: {
                title: payload.title,
                body: payload.body ?? "",
              },
              data: {
                type: "callrecover_notification",
                businessId: payload.businessId,
                callId: payload.callId ?? "",
                ...stringData(payload.data),
              },
              android: {
                priority: "high",
                notification: {
                  channel_id: "callrecover_leads",
                  sound: "default",
                },
              },
            },
          }),
        });

        if (response.ok) {
          sent += 1;
          return;
        }

        failed += 1;
        const result = (await response.json().catch(() => ({}))) as { error?: any };
        if (isInvalidTokenError(result.error)) {
          await supabase
            .from("mobile_push_tokens" as any)
            .update({ disabled_at: new Date().toISOString() })
            .eq("id", row.id);
        }
      }),
    );

    return { sent, failed };
  } catch (error) {
    console.warn("Mobile push send skipped", error);
    return { skipped: error instanceof Error ? error.message : "unknown_error", sent: 0, failed: 0 };
  }
}
