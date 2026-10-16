import { GROQ_BASE } from "@/lib/ai/groq";

/**
 * Optional same-origin pass-through to Groq, used by the client only when a direct
 * browser call fails (CORS, corporate proxy). The user's key arrives in the
 * Authorization header per request and is never stored or logged.
 */
const ALLOWED = new Set(["chat/completions", "audio/transcriptions"]);

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const path = (await ctx.params).path.join("/");
  const auth = req.headers.get("authorization");
  if (!ALLOWED.has(path)) return new Response("Bad path", { status: 400 });
  if (!auth) return new Response("Missing key", { status: 401 });

  const headers = new Headers({ authorization: auth });
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  const upstream = await fetch(`${GROQ_BASE}/${path}`, { method: "POST", headers, body: req.body, duplex: "half" } as RequestInit);
  const out = new Headers({ "content-type": upstream.headers.get("content-type") ?? "application/json" });
  const retry = upstream.headers.get("retry-after");
  if (retry) out.set("retry-after", retry);
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
