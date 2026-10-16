import { createGroq } from "@ai-sdk/groq";
import { APICallError, generateText, Output, transcribe as sdkTranscribe, type FlexibleSchema } from "ai";
import { getSettings } from "../settings";
import type { ApiKey } from "../db/schema";
import { allKeys, availableKeys, patchGroqKey, startKeyStore } from "./keys";

/** Groq through the Vercel AI SDK (`@ai-sdk/groq`), with our own key pool and model chain on top. */
export const GROQ_BASE = "https://api.groq.com/openai/v1";
/** Same-origin pass-through used only when the browser cannot reach Groq directly. */
export const PROXY_BASE = "/api/groq";

export class AiError extends Error {
  constructor(
    message: string,
    public readonly kind: "no-keys" | "all-failed" | "network" | "bad-response",
  ) {
    super(message);
  }
}

/** Injected for tests; the app uses global fetch. */
export type FetchLike = typeof fetch;

export function providerFor(key: string, opts: { fetchImpl?: FetchLike; baseURL?: string } = {}) {
  return createGroq({ apiKey: key, baseURL: opts.baseURL ?? GROQ_BASE, fetch: opts.fetchImpl });
}

function cooldownMs(headers: Record<string, string> | undefined) {
  const secs = Number(headers?.["retry-after"]);
  return Number.isFinite(secs) && secs > 0 ? secs * 1000 : 60_000;
}

/**
 * Runs `attempt` across the key pool and the model chain:
 * for each model, every usable key is tried; 429/5xx put the key on cooldown,
 * 401/403 mark it invalid, and 400/404 (model not available) skip to the next model.
 */
export async function withFailover<T>(
  attempt: (key: ApiKey, model: string) => Promise<T>,
  models: string[] = getSettings().models,
): Promise<T> {
  await startKeyStore();
  if (allKeys().length === 0) throw new AiError("No Groq API key configured", "no-keys");
  let lastError = "";
  modelLoop: for (const model of models) {
    const keys = availableKeys();
    if (keys.length === 0) break;
    for (const key of keys) {
      try {
        const out = await attempt(key, model);
        patchGroqKey(key.id, { last_used: Date.now() });
        return out;
      } catch (e) {
        patchGroqKey(key.id, { last_used: Date.now() });
        if (!APICallError.isInstance(e) || e.statusCode === undefined) {
          // Network/CORS/parse failure: another key will not help, but keep trying.
          lastError = e instanceof Error ? e.message : String(e);
          continue;
        }
        const status = e.statusCode;
        lastError = `${status} ${(e.responseBody ?? e.message).slice(0, 200)}`;
        if (status === 429 || status >= 500) {
          patchGroqKey(key.id, { cooldown_until: Date.now() + cooldownMs(e.responseHeaders) });
          continue;
        }
        if (status === 401 || status === 403) {
          patchGroqKey(key.id, { invalid: 1 });
          continue;
        }
        // 400/404/413: model or request problem → next model.
        continue modelLoop;
      }
    }
  }
  if (availableKeys().length === 0) throw new AiError(`All keys are rate-limited or invalid (${lastError})`, "all-failed");
  throw new AiError(`AI request failed: ${lastError}`, "bad-response");
}

/** Call directly; if the browser blocks it (CORS/network), retry the same key through the proxy. */
async function viaDirectThenProxy<T>(fn: (baseURL: string) => Promise<T>): Promise<T> {
  try {
    return await fn(GROQ_BASE);
  } catch (e) {
    const networkFailure = !APICallError.isInstance(e) || e.statusCode === undefined;
    if (typeof window === "undefined" || !networkFailure) throw e;
    return fn(PROXY_BASE);
  }
}

export async function chatObject<T>(
  schema: FlexibleSchema<T>,
  system: string,
  prompt: string,
  opts: { models?: string[]; fetchImpl?: FetchLike } = {},
): Promise<T> {
  return withFailover<T>(
    (key, model) =>
      viaDirectThenProxy(async (baseURL) => {
        const groq = providerFor(key.key, { fetchImpl: opts.fetchImpl, baseURL });
        const { output } = await generateText({
          model: groq(model),
          system,
          prompt,
          output: Output.object({ schema }),
          temperature: 0,
          maxOutputTokens: 800,
          maxRetries: 0, // the key pool is the retry policy
          providerOptions: model.startsWith("openai/") ? { groq: { reasoningEffort: "low" } } : undefined,
        });
        return output;
      }),
    opts.models,
  );
}

export async function transcribe(blob: Blob, opts: { language?: string; prompt?: string; fetchImpl?: FetchLike } = {}): Promise<string> {
  const { whisperModel } = getSettings();
  const audio = new Uint8Array(await blob.arrayBuffer());
  return withFailover<string>(
    (key) =>
      viaDirectThenProxy(async (baseURL) => {
        const groq = providerFor(key.key, { fetchImpl: opts.fetchImpl, baseURL });
        const { text } = await sdkTranscribe({
          model: groq.transcription(whisperModel),
          audio,
          maxRetries: 0,
          providerOptions: { groq: { language: opts.language ?? null, prompt: opts.prompt ?? null, temperature: 0 } },
        });
        return text.trim();
      }),
    [whisperModel],
  );
}
