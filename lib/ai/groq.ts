import { createGroq } from "@ai-sdk/groq";
import { APICallError, generateText, Output, transcribe as sdkTranscribe, type FlexibleSchema } from "ai";
import { getSettings } from "../settings";
import { hasAi, loadAiStatus } from "./status";

/**
 * Groq through the Vercel AI SDK (`@ai-sdk/groq`). The browser never holds a
 * key: every call goes to our /api/groq proxy, which injects a server key and
 * rotates on rate limits. The client only falls back across models.
 */
export const GROQ_BASE = "https://api.groq.com/openai/v1";
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

export function providerFor(opts: { fetchImpl?: FetchLike; baseURL?: string } = {}) {
  const base = opts.baseURL ?? (typeof window === "undefined" ? PROXY_BASE : `${window.location.origin}${PROXY_BASE}`);
  // The proxy ignores this header and uses the server's keys; the SDK just needs a value.
  return createGroq({ apiKey: "proxied", baseURL: base, fetch: opts.fetchImpl });
}

/**
 * Tries each model in the chain. 429/503 from the proxy means every server key
 * is exhausted or none is configured, so stop; 400/404 means the model is
 * unavailable, so move to the next one.
 */
export async function withModelFallback<T>(attempt: (model: string) => Promise<T>, models: string[] = getSettings().models): Promise<T> {
  await loadAiStatus();
  if (!hasAi()) throw new AiError("No Groq API key configured on the server", "no-keys");
  let lastError = "";
  for (const model of models) {
    try {
      return await attempt(model);
    } catch (e) {
      if (!APICallError.isInstance(e) || e.statusCode === undefined) {
        throw new AiError(e instanceof Error ? e.message : String(e), "network");
      }
      lastError = `${e.statusCode} ${(e.responseBody ?? e.message).slice(0, 200)}`;
      if (e.statusCode === 429) throw new AiError(`All keys are rate-limited (${lastError})`, "all-failed");
      if (e.statusCode === 503) throw new AiError("No Groq API key configured on the server", "no-keys");
      // 400/404/413/5xx: try the next model.
    }
  }
  throw new AiError(`AI request failed: ${lastError}`, "bad-response");
}

export async function chatObject<T>(
  schema: FlexibleSchema<T>,
  system: string,
  prompt: string,
  opts: { models?: string[]; fetchImpl?: FetchLike } = {},
): Promise<T> {
  const groq = providerFor({ fetchImpl: opts.fetchImpl });
  return withModelFallback<T>(async (model) => {
    const { output } = await generateText({
      model: groq(model),
      system,
      prompt,
      output: Output.object({ schema }),
      temperature: 0,
      maxOutputTokens: 800,
      maxRetries: 0, // the server key pool is the retry policy
      providerOptions: model.startsWith("openai/") ? { groq: { reasoningEffort: "low" } } : undefined,
    });
    return output;
  }, opts.models);
}

export async function transcribe(blob: Blob, opts: { language?: string; prompt?: string; fetchImpl?: FetchLike } = {}): Promise<string> {
  const { whisperModel } = getSettings();
  const audio = new Uint8Array(await blob.arrayBuffer());
  const groq = providerFor({ fetchImpl: opts.fetchImpl });
  return withModelFallback<string>(async (model) => {
    const { text } = await sdkTranscribe({
      model: groq.transcription(model),
      audio,
      maxRetries: 0,
      providerOptions: { groq: { language: opts.language ?? null, prompt: opts.prompt ?? null, temperature: 0 } },
    });
    return text.trim();
  }, [whisperModel]);
}
