/**
 * Planka MCP Server - Image Upload Tests
 * Uses compiled dist output to test the actual built modules.
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { optionalTools } from "../dist/tools/index.js";

describe("Upload operation flags", () => {
  it("flags attachments.create and backgroundImages.upload as uploads", () => {
    const attachments = optionalTools.find(t => t.name === "attachments");
    const backgrounds = optionalTools.find(t => t.name === "backgroundImages");
    assert.strictEqual(attachments?.operations.create.upload, true);
    assert.strictEqual(backgrounds?.operations.upload.upload, true);
  });
});
