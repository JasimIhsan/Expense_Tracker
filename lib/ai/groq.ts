import { getSettings, type GroqKey } from "../settings";
import { availableKeys, patchGroqKey } from "./keys";

export const GROQ_BASE = "https://api.groq.com/openai/v1";

export class AiError extends Error {
  constructor(
    message: string,
    public readonly kind: "no-keys" | "all-failed" | "network" | "bad-response",
  ) {
    super(message);
  }
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Injected for tests; the app uses global fetch. */
export type FetchLike = typeof fetch;

function cooldownMs(res: Response) {
  const ra = res.headers.get("retry-after");
  const secs = ra ? Number(ra) : NaN;
  return Number.isFinite(secs) && secs > 0 ? secs * 1000 : 60_000;
}

/**
 * Runs `attempt` across the key pool and the model chain:
 * for each model, every usable key is tried; 429/5xx put the key on cooldown,
 * 401/403 mark it invalid, and 400/404 (model not available) skip to the next model.
 */
export async function withFailover<T>(
  attempt: (key: GroqKey, model: string) => Promise<Response>,
  parse: (res: Response) => Promise<T>,
  models: string[] = getSettings().models,
): Promise<T> {
  if (availableKeys().length === 0 && getSettings().groqKeys.length === 0) {
    throw new AiError("No Groq API key configured", "no-keys");
  }
  let lastError = "";
  for (const model of models) {
    const keys = availableKeys();
    if (keys.length === 0) break;
    for (const key of keys) {
      let res: Response;
      try {
        res = await attempt(key, model);
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        // Network/CORS failure: try the next key, it will not help, but keep going.
        continue;
      }
      patchGroqKey(key.id, { lastUsed: Date.now() });
      if (res.ok) return parse(res);
      const body = await res.text().catch(() => "");
      lastError = `${res.status} ${body.slice(0, 200)}`;
      if (res.status === 429 || res.status >= 500) {
        patchGroqKey(key.id, { cooldownUntil: Date.now() + cooldownMs(res) });
        continue;
      }
      if (res.status === 401 || res.status === 403) {
        patchGroqKey(key.id, { invalid: true });
        continue;
      }
      // 400/404/413: model or request problem → next model.
      break;
    }
  }
  if (availableKeys().length === 0) throw new AiError(`All keys are rate-limited or invalid (${lastError})`, "all-failed");
  throw new AiError(`AI request failed: ${lastError}`, "bad-response");
}

/** Direct call; if the browser blocks it (CORS/network), retry through our proxy route. */
async function groqFetch(path: string, key: string, init: RequestInit, fetchImpl: FetchLike = fetch): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${key}`);
  try {
    return await fetchImpl(`${GROQ_BASE}/${path}`, { ...init, headers });
  } catch (e) {
    if (typeof window === "undefined") throw e;
    const proxyHeaders = new Headers(init.headers);
    proxyHeaders.set("x-groq-key", key);
    return fetchImpl(`/api/ai?path=${encodeURIComponent(path)}`, { ...init, headers: proxyHeaders });
  }
}

export async function chatJson<T>(
  messages: ChatMessage[],
  opts: { models?: string[]; maxTokens?: number; fetchImpl?: FetchLike } = {},
): Promise<T> {
  return withFailover<T>(
    (key, model) =>
      groqFetch(
        "chat/completions",
        key.key,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0,
            max_tokens: opts.maxTokens ?? 800,
            response_format: { type: "json_object" },
            ...(model.startsWith("openai/") ? { reasoning_effort: "low" } : {}),
          }),
        },
        opts.fetchImpl,
      ),
    async (res) => {
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content ?? "";
      try {
        return JSON.parse(content) as T;
      } catch {
        throw new AiError("Model returned invalid JSON", "bad-response");
      }
    },
    opts.models,
  );
}

export async function transcribe(blob: Blob, opts: { language?: string; prompt?: string; fetchImpl?: FetchLike } = {}): Promise<string> {
  const { whisperModel } = getSettings();
  return withFailover<string>(
    (key) => {
      const form = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
      form.append("file", blob, `audio.${ext}`);
      form.append("model", whisperModel);
      form.append("response_format", "json");
      form.append("temperature", "0");
      if (opts.language) form.append("language", opts.language);
      if (opts.prompt) form.append("prompt", opts.prompt);
      return groqFetch("audio/transcriptions", key.key, { method: "POST", body: form }, opts.fetchImpl);
    },
    async (res) => ((await res.json()) as { text?: string }).text?.trim() ?? "",
    [whisperModel],
  );
}
