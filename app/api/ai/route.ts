import { GROQ_BASE } from "@/lib/ai/groq";

/**
 * Optional pass-through used only when the browser cannot call Groq directly.
 * The key arrives per request in the x-groq-key header and is never stored.
 */
const ALLOWED = new Set(["chat/completions", "audio/transcriptions"]);

export async function POST(req: Request) {
  const path = new URL(req.url).searchParams.get("path") ?? "";
  const key = req.headers.get("x-groq-key");
  if (!ALLOWED.has(path)) return new Response("Bad path", { status: 400 });
  if (!key) return new Response("Missing key", { status: 401 });

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${key}`);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  const upstream = await fetch(`${GROQ_BASE}/${path}`, { method: "POST", headers, body: req.body, duplex: "half" } as RequestInit);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      ...(upstream.headers.get("retry-after") ? { "retry-after": upstream.headers.get("retry-after")! } : {}),
    },
  });
}
