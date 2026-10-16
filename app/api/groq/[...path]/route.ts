import { GROQ_BASE } from "@/lib/ai/groq";
import { forwardWithRotation, isConfigured } from "@/lib/ai/server-keys";

/**
 * The only way the browser talks to Groq. Keys live in the server environment
 * (GROQ_API_KEYS); this route injects one, rotating on rate limits.
 */
const ALLOWED = new Set(["chat/completions", "audio/transcriptions"]);

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const path = (await ctx.params).path.join("/");
  if (!ALLOWED.has(path)) return new Response("Bad path", { status: 400 });
  if (!isConfigured()) return Response.json({ error: { message: "GROQ_API_KEYS is not set on the server" } }, { status: 503 });

  const headers = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const body = await req.arrayBuffer();

  const upstream = await forwardWithRotation(`${GROQ_BASE}/${path}`, { headers, body });
  const out = new Headers({ "content-type": upstream.headers.get("content-type") ?? "application/json" });
  const retry = upstream.headers.get("retry-after");
  if (retry) out.set("retry-after", retry);
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
