import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { chatObject, AiError } from "./groq";
import { updateSettings } from "../settings";
import { __setAiStatusForTests } from "./status";

const Schema = z.object({ items: z.array(z.string()) });

function response(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}
const ok = (content: unknown) =>
  response(200, {
    id: "x",
    object: "chat.completion",
    created: 0,
    model: "m",
    choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(content) }, finish_reason: "stop" }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  });

const call = (fetchImpl: typeof fetch) => chatObject(Schema, "sys", "x", { fetchImpl });
const bodyOf = (init: RequestInit | undefined) => JSON.parse(String(init?.body)) as { model: string };
const urlOf = (input: RequestInfo | URL) => String(input);

describe("client model fallback through the proxy", () => {
  beforeEach(() => {
    updateSettings({ models: ["m1", "m2"] });
    __setAiStatusForTests({ configured: true, keys: 2 });
  });

  it("calls the proxy, not Groq, and returns the parsed object", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(ok({ items: ["a"] }));
    expect(await call(fetchImpl)).toEqual({ items: ["a"] });
    expect(urlOf(fetchImpl.mock.calls[0][0])).toBe("/api/groq/chat/completions");
    expect(bodyOf(fetchImpl.mock.calls[0][1]).model).toBe("m1");
  });

  it("moves to the next model on 404", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(404, { error: "model not found" }))
      .mockResolvedValueOnce(ok({ items: [] }));
    await call(fetchImpl);
    expect(bodyOf(fetchImpl.mock.calls[1][1]).model).toBe("m2");
  });

  it("stops with all-failed when the proxy reports 429", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response(429, {}));
    await expect(call(fetchImpl)).rejects.toMatchObject({ kind: "all-failed" } satisfies Partial<AiError>);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("throws no-keys when the server has no keys", async () => {
    __setAiStatusForTests({ configured: false, keys: 0 });
    await expect(call(vi.fn<typeof fetch>())).rejects.toMatchObject({ kind: "no-keys" });
  });
});
