// Provider-specific request details (endpoint, key, options). Server-only; keys never leave here.
import type { ModelRef } from "./models.server";

function endpoint(t: ModelRef): { url: string; key?: string } {
  if (t.provider === "groq") return { url: "https://api.groq.com/openai/v1/chat/completions", key: process.env["GROQ_API_KEY"] };
  if (t.provider === "nvidia") return { url: "https://integrate.api.nvidia.com/v1/chat/completions", key: process.env["NVIDIA_API_KEY"] };
  const account = process.env["CLOUDFLARE_ACCOUNT_ID"];
  return { url: `https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1/chat/completions`, key: account ? process.env["CLOUDFLARE_API_TOKEN"] : undefined };
}

export type ProviderResult = { ok: true; body: ReadableStream<Uint8Array> } | { ok: false; status: number; reason: string };

const CONNECT_TIMEOUT_MS = 30_000; // time allowed until the provider starts answering

export async function streamFromProvider(t: ModelRef, messages: unknown[], opts: { maxTokens: number; deep: boolean }, signal: AbortSignal): Promise<ProviderResult> {
  const { url, key } = endpoint(t);
  if (!key) return { ok: false, status: 503, reason: "not configured" };
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal.addEventListener("abort", onAbort);
  const timer = setTimeout(() => ctrl.abort(), CONNECT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: t.model,
        messages,
        stream: true,
        max_tokens: opts.maxTokens,
        ...(opts.deep && t.provider === "groq" ? { reasoning_effort: "high" } : {}),
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.ok && res.body) return { ok: true, body: res.body };
    const reason = (await res.text().catch(() => "")).slice(0, 300);
    return { ok: false, status: res.status, reason };
  } catch (e: any) {
    clearTimeout(timer);
    return { ok: false, status: signal.aborted ? 499 : 504, reason: e?.message ?? "network error" };
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
