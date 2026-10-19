import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { DeepSeekSDK } from "../src/sdk/deepseek/sdk";
import { AIService } from "../src/services/ai.service";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("transient failures have a small bounded retry budget", async () => {
  let attempts = 0;
  const delays: number[] = [];
  globalThis.fetch = async () => {
    attempts++;
    return new Response("Unavailable", { status: 503 });
  };
  const sdk = new DeepSeekSDK({ apiKey: "test" });
  (sdk as any).sleep = async (ms: number) => {
    delays.push(ms);
  };
  await assert.rejects(sdk.createTextCompletion("text"), /503/);
  assert.equal(attempts, 3);
  assert.ok(delays.every((delay) => delay <= 10000));
});

test("a stalled HTTP request is aborted and its timeout remains active for the body", async () => {
  let signal: AbortSignal | null | undefined;
  globalThis.fetch = async (_url, options) => {
    signal = options?.signal;
    return {
      ok: true,
      json: () =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(signal?.reason), {
            once: true,
          });
        }),
    } as Response;
  };
  const sdk = new DeepSeekSDK({
    apiKey: "test",
    maxRetries: 1,
    requestTimeoutMs: 20,
  });
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(sdk.createTextCompletion("text"), /timeout|aborted/i);
    assert.equal(signal?.aborted, true);
  } finally {
    clearTimeout(keepAlive);
  }
});

test("a timed out request can be retried successfully", async () => {
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts++;
    if (attempts === 1)
      throw new DOMException("Request timed out", "TimeoutError");
    return Response.json({ choices: [{ message: { content: "Recovered" } }] });
  };
  const sdk = new DeepSeekSDK({ apiKey: "test" });
  (sdk as any).sleep = async () => {};
  assert.equal(await sdk.createTextCompletion("text"), "Recovered");
  assert.equal(attempts, 2);
});

test("permanent API errors are not retried", async () => {
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts++;
    return new Response("Unauthorized", { status: 401 });
  };
  await assert.rejects(
    new DeepSeekSDK({ apiKey: "test" }).createTextCompletion("text"),
    /401/,
  );
  assert.equal(attempts, 1);
});

test("AI failure falls back to a short plain text title", async () => {
  globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });
  const title = await new AIService("test").summarizeTextToOneSentence(
    `<b>Hello</b>\n ${"world ".repeat(30)}`,
  );
  assert.ok(title.startsWith("Hello world"));
  assert.ok(title.length <= 100);
  assert.ok(!title.includes("<"));
});
