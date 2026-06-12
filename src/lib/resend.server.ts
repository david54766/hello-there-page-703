type SendEmailInput = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

import { getServerEnv } from "@/lib/env.server";

export function hasResendConfig() {
  return Boolean(getServerEnv("RESEND_API_KEY"));
}

export async function sendResendEmail(input: SendEmailInput): Promise<{ id: string | null }> {
  const apiKey = getServerEnv("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (payload as { message?: string }).message ?? `Resend error ${res.status}`;
    throw new Error(message);
  }

  return { id: (payload as { id?: string }).id ?? null };
}
