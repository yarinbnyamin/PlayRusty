export const PLAYGROUND_URL = "https://play.rust-lang.org/execute";
export const BRIDGE_DOWN_MESSAGE = "The compiler bridge is down. Check your connection and try again.";
const TIMEOUT_MESSAGE = "The compiler took too long to answer. Try again in a moment.";

export type RunResult =
  | { ok: true; success: boolean; stdout: string; stderr: string }
  | { ok: false; reason: "network" | "timeout" | "http"; message: string };

export interface RunOptions {
  tests: boolean;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

interface PlaygroundResponse {
  success?: boolean;
  stdout?: string;
  stderr?: string;
}

export async function runCode(code: string, options: RunOptions): Promise<RunResult> {
  const { tests, timeoutMs = 20_000 } = options;
  const fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(PLAYGROUND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "stable", mode: "debug", edition: "2024", crateType: "bin", tests, code, backtrace: false }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: "http", message: BRIDGE_DOWN_MESSAGE };
    const data = (await response.json()) as PlaygroundResponse;
    return { ok: true, success: data.success === true, stdout: data.stdout ?? "", stderr: data.stderr ?? "" };
  } catch {
    if (controller.signal.aborted) return { ok: false, reason: "timeout", message: TIMEOUT_MESSAGE };
    return { ok: false, reason: "network", message: BRIDGE_DOWN_MESSAGE };
  } finally {
    clearTimeout(timer);
  }
}
