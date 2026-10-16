import { describe, expect, it, vi } from "vitest";
import { forwardWithRotation, parseKeys, type KeyState } from "./server-keys";

const res = (status: number, headers: Record<string, string> = {}) => new Response("{}", { status, headers });
const authOf = (init: RequestInit | undefined) => new Headers(init?.headers).get("authorization");
const call = (pool: KeyState[], fetchImpl: typeof fetch) =>
  forwardWithRotation("https://x/chat/completions", { headers: new Headers(), body: null }, { pool, fetchImpl });

describe("server key pool", () => {
  it("parses comma / newline separated keys", () => {
    expect(parseKeys("a, b\nc;;").map((k) => k.key)).toEqual(["a", "b", "c"]);
  });

  it("uses the least recently used key first", async () => {
    const pool = parseKeys("k1,k2");
    pool[0].lastUsed = 10;
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(res(200));
    await call(pool, fetchImpl);
    expect(authOf(fetchImpl.mock.calls[0][1])).toBe("Bearer k2");
  });

  it("rotates on 429 and puts the key on cooldown from retry-after", async () => {
    const pool = parseKeys("k1,k2");
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(res(429, { "retry-after": "30" }))
      .mockResolvedValueOnce(res(200));
    const out = await call(pool, fetchImpl);
    expect(out.status).toBe(200);
    expect(authOf(fetchImpl.mock.calls[1][1])).toBe("Bearer k2");
    expect(pool[0].cooldownUntil).toBeGreaterThan(Date.now() + 20_000);
  });

  it("marks a key invalid on 401 and does not retry a 400", async () => {
    const pool = parseKeys("k1,k2");
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(400));
    const out = await call(pool, fetchImpl);
    expect(out.status).toBe(400);
    expect(pool[0].invalid).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns 429 when every key is exhausted", async () => {
    const pool = parseKeys("k1");
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(res(429));
    expect((await call(pool, fetchImpl)).status).toBe(429);
    expect((await call(pool, fetchImpl)).status).toBe(429); // on cooldown now: no upstream call
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
