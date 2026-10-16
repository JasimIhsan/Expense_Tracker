import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { chatObject, AiError } from "./groq";
import { updateSettings } from "../settings";
import { __setKeysForTests, allKeys } from "./keys";
import type { ApiKey } from "../db/schema";

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

const key = (id: string, k: string): ApiKey => ({
  id, user_id: "local", provider: "groq", label: id, key: k, cooldown_until: 0, invalid: 0, last_used: null,
  created_at: "", updated_at: "", deleted_at: null, dirty: 0,
});

const call = (fetchImpl: typeof fetch) => chatObject(Schema, "sys", "x", { fetchImpl });
const headerOf = (init: RequestInit | undefined, name: string) => new Headers(init?.headers).get(name);
const bodyOf = (init: RequestInit | undefined) => JSON.parse(String(init?.body)) as { model: string };

describe("Groq failover", () => {
  beforeEach(() => {
    updateSettings({ models: ["m1", "m2"] });
    __setKeysForTests([key("one", "k1"), key("two", "k2")]);
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
    expect(allKeys().find((k) => k.key === "k1")!.cooldown_until).toBeGreaterThan(Date.now() + 20_000);
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
    expect(allKeys().find((k) => k.key === "k1")!.invalid).toBe(1);
  });

  it("throws all-failed when every key is exhausted", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => response(429, {}));
    await expect(call(fetchImpl)).rejects.toMatchObject({ kind: "all-failed" } satisfies Partial<AiError>);
  });

  it("throws no-keys without keys", async () => {
    __setKeysForTests([]);
    await expect(call(vi.fn<typeof fetch>())).rejects.toMatchObject({ kind: "no-keys" });
  });
});
