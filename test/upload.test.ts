/**
 * Planka MCP Server - Image Upload Tests
 * Uses compiled dist output to test the actual built modules.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { optionalTools, coreTools, adminTools } from "../dist/tools/index.js";
import {
  resolveBytes,
  buildUploadForm,
  MAX_URL_DOWNLOAD_BYTES,
} from "../dist/upload.js";
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from "undici";

describe("Upload operation flags", () => {
  it("flags attachments.create and backgroundImages.upload as uploads", () => {
    const attachments = optionalTools.find(t => t.name === "attachments");
    const backgrounds = optionalTools.find(t => t.name === "backgroundImages");
    assert.strictEqual(attachments?.operations.create.upload, "attachment");
    assert.strictEqual(backgrounds?.operations.upload.upload, "file");
  });

  it("flags users.updateAvatar as an upload", () => {
    const users = adminTools.find(t => t.name === "users");
    assert.strictEqual(users?.operations.updateAvatar.upload, "file");
  });
});

describe("resolveBytes — url", () => {
  it("rejects when no url is provided", async () => {
    await assert.rejects(() => resolveBytes({}), /url/i);
  });

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

  it("rejects a non-http(s) url scheme", async () => {
    await assert.rejects(() => resolveBytes({ url: "file:///etc/passwd" }), /protocol/i);
  });
});

describe("buildUploadForm", () => {
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

  it("builds a plain file form with a file part (no name field)", async () => {
    pool().intercept({ path: "/bg.png", method: "GET" })
      .reply(200, Buffer.from("BG"), { headers: { "content-type": "image/png" } });

    const form = await buildUploadForm("file", { url: "http://store.test/bg.png", name: "ignored" });
    const file = form.get("file") as File;
    assert.ok(file, "file part present");
    assert.strictEqual(await file.text(), "BG");
    assert.strictEqual(form.get("name"), null, "backgrounds have no name field");
  });

  it("builds a file attachment with type, name, and file part", async () => {
    pool().intercept({ path: "/img.png", method: "GET" })
      .reply(200, Buffer.from("IMG"), { headers: { "content-type": "image/png" } });

    const form = await buildUploadForm("attachment", { type: "file", url: "http://store.test/img.png", name: "pic.png" });
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

describe("Schema documentation for image flows", () => {
  it("documents url/type on attachments data", () => {
    const t = optionalTools.find(t => t.name === "attachments")!;
    const desc = t.inputSchema.properties.data.description as string;
    assert.match(desc, /url/);
    assert.doesNotMatch(desc, /base64/);
    assert.match(desc, /file.*link|link.*file/);
  });

  it("documents url on backgroundImages data", () => {
    const t = optionalTools.find(t => t.name === "backgroundImages")!;
    const desc = t.inputSchema.properties.data.description as string;
    assert.match(desc, /url/);
    assert.doesNotMatch(desc, /base64/);
  });

  it("documents coverAttachmentId on cards update data", () => {
    const t = coreTools.find(t => t.name === "cards")!;
    const desc = t.inputSchema.properties.data.description as string;
    assert.match(desc, /coverAttachmentId/);
  });

  it("documents backgroundImageId on projects update data", () => {
    const t = coreTools.find(t => t.name === "projects")!;
    const desc = t.inputSchema.properties.data.description as string;
    assert.match(desc, /backgroundImageId/);
  });
});
