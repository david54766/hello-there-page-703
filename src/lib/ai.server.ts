const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function aiJSON<T>(opts: {
  system?: string;
  prompt: string;
  model?: string;
}): Promise<T> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3-flash-preview",
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: opts.prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit — try again shortly");
  if (res.status === 402) throw new Error("AI credits exhausted — add credits in workspace settings");
  if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}

export async function aiText(opts: { system?: string; prompt: string; model?: string }): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3-flash-preview",
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: opts.prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}