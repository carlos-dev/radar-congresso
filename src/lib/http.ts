export interface FetchOpts {
  retries?: number;
  delayMs?: number;
  headers?: Record<string, string>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchOpts = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const { retries = 3, delayMs = 500, headers = {} } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, { headers: { Accept: "application/json", ...headers } });
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(delayMs);
    }
  }
  throw lastErr;
}
