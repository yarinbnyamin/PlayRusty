// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BRIDGE_DOWN_MESSAGE, PLAYGROUND_URL, runCode } from "../src/playground/client";

describe("runCode", () => {
  it("posts the expected request and returns the output", async () => {
    let url = "";
    let init: RequestInit | undefined;
    const fetchFn = (async (input: RequestInfo | URL, options?: RequestInit) => {
      url = String(input);
      init = options;
      return new Response(JSON.stringify({ success: true, exitDetail: "", stdout: "hi\n", stderr: "" }));
    }) as typeof fetch;

    const result = await runCode("fn main() {}", { tests: true, fetchFn });

    expect(url).toBe(PLAYGROUND_URL);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      channel: "stable", mode: "debug", edition: "2024", crateType: "bin",
      tests: true, code: "fn main() {}", backtrace: false,
    });
    expect(result).toEqual({ ok: true, success: true, stdout: "hi\n", stderr: "" });
  });

  it("reports HTTP errors", async () => {
    const fetchFn = (async () => new Response("busy", { status: 503 })) as typeof fetch;
    expect(await runCode("", { tests: false, fetchFn })).toEqual({ ok: false, reason: "http", message: BRIDGE_DOWN_MESSAGE });
  });

  it("reports network errors", async () => {
    const fetchFn = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    expect(await runCode("", { tests: false, fetchFn })).toEqual({ ok: false, reason: "network", message: BRIDGE_DOWN_MESSAGE });
  });

  it("times out", async () => {
    const fetchFn = ((_input: RequestInfo | URL, options?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })) as typeof fetch;
    const result = await runCode("", { tests: false, fetchFn, timeoutMs: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("timeout");
  });
});
