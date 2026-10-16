import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { chatObject, AiError } from "./groq";
import { getSettings, updateSettings } from "../settings";
import { addGroqKey } from "./keys";

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
const headerOf = (init: RequestInit | undefined, name: string) => new Headers(init?.headers).get(name);
const bodyOf = (init: RequestInit | undefined) => JSON.parse(String(init?.body)) as { model: string };

describe("Groq failover", () => {
  beforeEach(() => {
    updateSettings({ groqKeys: [], models: ["m1", "m2"] });
    addGroqKey("k1", "one");
    addGroqKey("k2", "two");
  });

  it("returns the parsed object", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(ok({ items: ["a"] }));
    expect(await call(fetchImpl)).toEqual({ items: ["a"] });
    expect(headerOf(fetchImpl.mock.calls[0][1], "authorization")).toBe("Bearer k1");
    expect(bodyOf(fetchImpl.mock.calls[0][1]).model).toBe("m1");
  });

  it("rotates to the next key on 429 and puts the first on cooldown", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(429, { error: "limit" }, { "retry-after": "30" }))
      .mockResolvedValueOnce(ok({ items: [] }));
    await call(fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(headerOf(fetchImpl.mock.calls[0][1], "authorization")).toBe("Bearer k1");
    expect(headerOf(fetchImpl.mock.calls[1][1], "authorization")).toBe("Bearer k2");
    const k1 = getSettings().groqKeys.find((k) => k.key === "k1")!;
    expect(k1.cooldownUntil).toBeGreaterThan(Date.now() + 20_000);
  });

  it("moves to the next model on 404", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(404, { error: "model not found" }))
      .mockResolvedValueOnce(ok({ items: [] }));
    await call(fetchImpl);
    expect(bodyOf(fetchImpl.mock.calls[0][1]).model).toBe("m1");
    expect(bodyOf(fetchImpl.mock.calls[1][1]).model).toBe("m2");
  });

  it("marks a key invalid on 401", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(401, {}))
      .mockResolvedValueOnce(ok({ items: [] }));
    await call(fetchImpl);
    expect(getSettings().groqKeys.find((k) => k.key === "k1")!.invalid).toBe(true);
  });

  it("throws all-failed when every key is exhausted", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => response(429, {}));
    await expect(call(fetchImpl)).rejects.toMatchObject({ kind: "all-failed" } satisfies Partial<AiError>);
  });

  it("throws no-keys without keys", async () => {
    updateSettings({ groqKeys: [] });
    await expect(call(vi.fn<typeof fetch>())).rejects.toMatchObject({ kind: "no-keys" });
  });
});
