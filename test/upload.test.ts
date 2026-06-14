/**
 * Planka MCP Server - Image Upload Tests
 * Uses compiled dist output to test the actual built modules.
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { optionalTools } from "../dist/tools/index.js";
import { resolveBytes, MAX_BASE64_BYTES, MAX_URL_DOWNLOAD_BYTES } from "../dist/upload.js";
import { MockAgent, setGlobalDispatcher } from "undici";

describe("Upload operation flags", () => {
  it("flags attachments.create and backgroundImages.upload as uploads", () => {
    const attachments = optionalTools.find(t => t.name === "attachments");
    const backgrounds = optionalTools.find(t => t.name === "backgroundImages");
    assert.strictEqual(attachments?.operations.create.upload, true);
    assert.strictEqual(backgrounds?.operations.upload.upload, true);
  });
});

describe("resolveBytes — base64", () => {
  it("decodes base64 into bytes with a filename and content type", async () => {
    const b64 = Buffer.from("hello").toString("base64");
    const out = await resolveBytes({ base64: b64, name: "greeting.txt" });
    assert.strictEqual(out.bytes.toString(), "hello");
    assert.strictEqual(out.filename, "greeting.txt");
    assert.ok(out.contentType);
  });

  it("rejects base64 larger than the cap", async () => {
    const big = Buffer.alloc(MAX_BASE64_BYTES + 1).toString("base64");
    await assert.rejects(() => resolveBytes({ base64: big }), /too large/i);
  });

  it("rejects when neither url nor base64 is provided", async () => {
    await assert.rejects(() => resolveBytes({}), /url.*base64/i);
  });
});

describe("resolveBytes — url", () => {
  it("fetches bytes from a url and derives filename + content type", async () => {
    const agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
    agent.get("http://store.test")
      .intercept({ path: "/img/cat.png", method: "GET" })
      .reply(200, Buffer.from("PNGDATA"), { headers: { "content-type": "image/png" } });

    const out = await resolveBytes({ url: "http://store.test/img/cat.png" });
    assert.strictEqual(out.bytes.toString(), "PNGDATA");
    assert.strictEqual(out.filename, "cat.png");
    assert.strictEqual(out.contentType, "image/png");
    await agent.close();
  });

  it("rejects a non-2xx url response", async () => {
    const agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
    agent.get("http://store.test").intercept({ path: "/missing", method: "GET" }).reply(404, "nope");

    await assert.rejects(() => resolveBytes({ url: "http://store.test/missing" }), /HTTP 404/);
    await agent.close();
  });

  it("rejects a url whose content-length exceeds the cap", async () => {
    const agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
    agent.get("http://store.test")
      .intercept({ path: "/big", method: "GET" })
      .reply(200, "x", { headers: { "content-length": String(MAX_URL_DOWNLOAD_BYTES + 1) } });

    await assert.rejects(() => resolveBytes({ url: "http://store.test/big" }), /too large/i);
    await agent.close();
  });
});
