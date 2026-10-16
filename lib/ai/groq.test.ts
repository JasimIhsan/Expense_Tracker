import { beforeEach, describe, expect, it, vi } from "vitest";
import { chatJson, AiError } from "./groq";
import { getSettings, updateSettings } from "../settings";
import { addGroqKey } from "./keys";

function response(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}
const ok = (content: unknown) => response(200, { choices: [{ message: { content: JSON.stringify(content) } }] });

describe("Groq failover", () => {
  beforeEach(() => {
    updateSettings({ groqKeys: [], models: ["m1", "m2"] });
    addGroqKey("k1", "one");
    addGroqKey("k2", "two");
  });

  it("rotates to the next key on 429 and puts the first on cooldown", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(429, { error: "limit" }, { "retry-after": "30" }))
      .mockResolvedValueOnce(ok({ items: [] }));
    const out = await chatJson<{ items: unknown[] }>([{ role: "user", content: "x" }], { fetchImpl });
    expect(out).toEqual({ items: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const auth = (i: number) => (fetchImpl.mock.calls[i][1]!.headers as Headers).get("authorization");
    expect(auth(0)).toBe("Bearer k1");
    expect(auth(1)).toBe("Bearer k2");
    const k1 = getSettings().groqKeys.find((k) => k.key === "k1")!;
    expect(k1.cooldownUntil).toBeGreaterThan(Date.now() + 20_000);
  });

  it("moves to the next model on 400/404", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(404, { error: "model not found" }))
      .mockResolvedValueOnce(ok({ a: 1 }));
    await chatJson([{ role: "user", content: "x" }], { fetchImpl });
    const model = (i: number) => JSON.parse(fetchImpl.mock.calls[i][1]!.body as string).model;
    expect(model(0)).toBe("m1");
    expect(model(1)).toBe("m2");
  });

  it("marks a key invalid on 401", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(401, {}))
      .mockResolvedValueOnce(ok({}));
    await chatJson([{ role: "user", content: "x" }], { fetchImpl });
    expect(getSettings().groqKeys.find((k) => k.key === "k1")!.invalid).toBe(true);
  });

  it("throws all-failed when every key is exhausted", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response(429, {}));
    await expect(chatJson([{ role: "user", content: "x" }], { fetchImpl })).rejects.toMatchObject({ kind: "all-failed" } satisfies Partial<AiError>);
  });

  it("throws no-keys without keys", async () => {
    updateSettings({ groqKeys: [] });
    await expect(chatJson([{ role: "user", content: "x" }])).rejects.toMatchObject({ kind: "no-keys" });
  });
});
