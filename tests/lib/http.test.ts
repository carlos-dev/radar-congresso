import { describe, it, expect, vi } from "vitest";
import { fetchJson } from "../../src/lib/http";

describe("fetchJson", () => {
  it("retorna JSON no sucesso", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: "world" }),
    });
    const data = await fetchJson("http://x", {}, fakeFetch as unknown as typeof fetch);
    expect(data).toEqual({ hello: "world" });
  });

  it("tenta de novo em erro e depois lança", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(
      fetchJson("http://x", { retries: 2, delayMs: 0 }, fakeFetch as unknown as typeof fetch),
    ).rejects.toThrow(/500/);
    expect(fakeFetch).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });
});
