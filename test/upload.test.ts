/**
 * Planka MCP Server - Image Upload Tests
 * Uses compiled dist output to test the actual built modules.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { optionalTools } from "../dist/tools/index.js";
import {
  resolveBytes,
  buildUploadForm,
  MAX_BASE64_BYTES,
  MAX_URL_DOWNLOAD_BYTES,
} from "../dist/upload.js";
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from "undici";

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
    assert.strictEqual(out.contentType, "application/octet-stream");
  });

  it("decodes a base64 data: URI and captures its mime type", async () => {
    const uri = "data:image/png;base64," + Buffer.from("PNG").toString("base64");
    const out = await resolveBytes({ base64: uri });
    assert.strictEqual(out.bytes.toString(), "PNG");
    assert.strictEqual(out.contentType, "image/png");
  });

  it("rejects base64 larger than the cap", async () => {
    const big = Buffer.alloc(MAX_BASE64_BYTES + 1).toString("base64");
    await assert.rejects(() => resolveBytes({ base64: big }), /too large/i);
  });

  it("rejects base64 that decodes to zero bytes", async () => {
    await assert.rejects(() => resolveBytes({ base64: "@@@@" }), /0 bytes/);
  });

  it("rejects when neither url nor base64 is provided", async () => {
    await assert.rejects(() => resolveBytes({}), /url.*base64/i);
  });
});

describe("resolveBytes — url", () => {
  const original = getGlobalDispatcher();
  let agent: MockAgent;

  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
  });

  afterEach(async () => {
    await agent.close();
    setGlobalDispatcher(original);
  });

  const pool = () => agent.get("http://store.test");

  it("fetches bytes from a url and derives filename + content type", async () => {
    pool().intercept({ path: "/img/cat.png", method: "GET" })
      .reply(200, Buffer.from("PNGDATA"), { headers: { "content-type": "image/png" } });

    const out = await resolveBytes({ url: "http://store.test/img/cat.png" });
    assert.strictEqual(out.bytes.toString(), "PNGDATA");
    assert.strictEqual(out.filename, "cat.png");
    assert.strictEqual(out.contentType, "image/png");
  });

  it("uses an explicit name over the url-derived filename", async () => {
    pool().intercept({ path: "/img/cat.png", method: "GET" })
      .reply(200, Buffer.from("X"), { headers: { "content-type": "image/png" } });

    const out = await resolveBytes({ url: "http://store.test/img/cat.png", name: "renamed.png" });
    assert.strictEqual(out.filename, "renamed.png");
  });

  it("falls back to 'upload' when the url path has no basename", async () => {
    pool().intercept({ path: "/", method: "GET" })
      .reply(200, Buffer.from("X"), { headers: { "content-type": "image/png" } });

    const out = await resolveBytes({ url: "http://store.test/" });
    assert.strictEqual(out.filename, "upload");
  });

  it("falls back to octet-stream when the response has no content-type", async () => {
    pool().intercept({ path: "/raw", method: "GET" }).reply(200, Buffer.from("X"));

    const out = await resolveBytes({ url: "http://store.test/raw" });
    assert.strictEqual(out.contentType, "application/octet-stream");
  });

  it("rejects a non-2xx url response", async () => {
    pool().intercept({ path: "/missing", method: "GET" }).reply(404, "nope");
    await assert.rejects(() => resolveBytes({ url: "http://store.test/missing" }), /HTTP 404/);
  });

  it("rejects a url whose declared content-length exceeds the cap", async () => {
    pool().intercept({ path: "/big", method: "GET" })
      .reply(200, "x", { headers: { "content-length": String(MAX_URL_DOWNLOAD_BYTES + 1) } });
    await assert.rejects(() => resolveBytes({ url: "http://store.test/big" }), /too large/i);
  });

  it("rejects an oversized body even without a trustworthy content-length", async () => {
    const big = Buffer.alloc(MAX_URL_DOWNLOAD_BYTES + 16, 0x61);
    pool().intercept({ path: "/stream", method: "GET" }).reply(200, big);
    await assert.rejects(() => resolveBytes({ url: "http://store.test/stream" }), /too large/i);
  });

  it("fetches the url when both url and base64 are provided (url wins)", async () => {
    pool().intercept({ path: "/img.png", method: "GET" })
      .reply(200, Buffer.from("FROMURL"), { headers: { "content-type": "image/png" } });

    const out = await resolveBytes({
      url: "http://store.test/img.png",
      base64: Buffer.from("FROMB64").toString("base64"),
    });
    assert.strictEqual(out.bytes.toString(), "FROMURL");
  });

  it("rejects a non-http(s) url scheme", async () => {
    await assert.rejects(() => resolveBytes({ url: "file:///etc/passwd" }), /protocol/i);
  });
});

describe("buildUploadForm", () => {
  it("builds a background form with a file part (no name field)", async () => {
    const b64 = Buffer.from("BG").toString("base64");
    const form = await buildUploadForm("background", { base64: b64, name: "ignored" });
    const file = form.get("file") as File;
    assert.ok(file, "file part present");
    assert.strictEqual(await file.text(), "BG");
    assert.strictEqual(form.get("name"), null, "backgrounds have no name field");
  });

  it("builds a file attachment with type, name, and file part", async () => {
    const b64 = Buffer.from("IMG").toString("base64");
    const form = await buildUploadForm("attachment", { type: "file", base64: b64, name: "pic.png" });
    assert.strictEqual(form.get("type"), "file");
    assert.strictEqual(form.get("name"), "pic.png");
    const file = form.get("file") as File;
    assert.strictEqual(await file.text(), "IMG");
    assert.strictEqual(file.name, "pic.png");
  });

  it("builds a link attachment with url and no file part", async () => {
    const form = await buildUploadForm("attachment", {
      type: "link",
      url: "https://example.com/page",
      name: "A link",
    });
    assert.strictEqual(form.get("type"), "link");
    assert.strictEqual(form.get("url"), "https://example.com/page");
    assert.strictEqual(form.get("name"), "A link");
    assert.strictEqual(form.get("file"), null, "link attachments have no file part");
  });

  it("rejects a link attachment with no url", async () => {
    await assert.rejects(
      () => buildUploadForm("attachment", { type: "link", name: "x" }),
      /link attachment requires/i
    );
  });
});
