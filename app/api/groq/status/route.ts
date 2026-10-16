import { isConfigured, keyPool } from "@/lib/ai/server-keys";

/** Lets the client know whether AI features are available on this deployment. */
export function GET() {
  return Response.json({ configured: isConfigured(), keys: keyPool().length });
}
