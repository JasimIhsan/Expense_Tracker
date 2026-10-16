import "server-only";

/**
 * Groq key pool, server side. Keys come from the environment:
 *   GROQ_API_KEYS=gsk_a,gsk_b,gsk_c   (or a single GROQ_API_KEY)
 * They never reach the browser. Rotation state is in-memory per server
 * instance, which is enough to spread load and skip a key that is limited.
 */
export type KeyState = { key: string; cooldownUntil: number; invalid: boolean; lastUsed: number };

export function parseKeys(raw: string | undefined): KeyState[] {
  return (raw ?? "")
    .split(/[\s,;]+/)
    .map((k) => k.trim())
    .filter(Boolean)
    .map((key) => ({ key, cooldownUntil: 0, invalid: false, lastUsed: 0 }));
}

let pool: KeyState[] | null = null;

export function keyPool(): KeyState[] {
  if (!pool) pool = parseKeys(process.env.GROQ_API_KEYS ?? process.env.GROQ_API_KEY);
  return pool;
}

export const isConfigured = () => keyPool().length > 0;

export function available(p: KeyState[], now = Date.now()) {
  return p.filter((k) => !k.invalid && k.cooldownUntil <= now).sort((a, b) => a.lastUsed - b.lastUsed);
}

function cooldownMs(res: Response) {
  const secs = Number(res.headers.get("retry-after"));
  return Number.isFinite(secs) && secs > 0 ? secs * 1000 : 60_000;
}

export type Outcome = "ok" | "rotate" | "stop";

/** Classifies an upstream response and updates the key's state. */
export function classify(k: KeyState, res: Response, now = Date.now()): Outcome {
  k.lastUsed = now;
  if (res.ok) return "ok";
  if (res.status === 429 || res.status >= 500) {
    k.cooldownUntil = now + cooldownMs(res);
    return "rotate";
  }
  if (res.status === 401 || res.status === 403) {
    k.invalid = true;
    return "rotate";
  }
  // 400/404/413: the request or model is the problem, not the key.
  return "stop";
}

/**
 * Sends the request with each usable key in turn. Returns the first non-key
 * failure or success; when every key is exhausted returns a 429 so the client
 * can queue the note and retry later.
 */
export async function forwardWithRotation(
  url: string,
  init: { headers: Headers; body: ArrayBuffer | null },
  opts: { pool?: KeyState[]; fetchImpl?: typeof fetch; now?: () => number } = {},
): Promise<Response> {
  const p = opts.pool ?? keyPool();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;
  let last: Response | null = null;
  for (const k of available(p, now())) {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${k.key}`);
    const res = await fetchImpl(url, { method: "POST", headers, body: init.body });
    const outcome = classify(k, res, now());
    if (outcome !== "rotate") return res;
    last = res;
  }
  if (last) return last;
  return new Response(JSON.stringify({ error: { message: "All Groq keys are rate-limited or invalid" } }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": "60" },
  });
}
