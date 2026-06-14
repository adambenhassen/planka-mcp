import { request as undiciRequest } from "undici";
import { basename } from "node:path";

/** Max decoded size for the base64 fallback (~1 MB). base64 args are LLM-emitted and expensive. */
export const MAX_BASE64_BYTES = 1 * 1024 * 1024;
/** Max size we will download from a url, so a bad link can't pull an unbounded blob into memory. */
export const MAX_URL_DOWNLOAD_BYTES = 10 * 1024 * 1024;

/** Only fetch over http(s); blocks file:, data:, gopher:, etc. (cheap SSRF guard). */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export interface UploadData {
  /** For type:'file' uploads: where to fetch bytes from. For type:'link' attachments: the link target (not fetched). */
  url?: string;
  /** Capped base64 fallback for tiny images. Accepts a bare base64 string or a base64 data: URI. */
  base64?: string;
  /** Attachment/file name. */
  name?: string;
  /** Attachment type; 'link' attachments carry a url but no file part. */
  type?: "file" | "link";
  [key: string]: unknown;
}

export interface ResolvedBytes {
  bytes: Buffer;
  filename: string;
  contentType: string;
}

export async function resolveBytes(data: UploadData): Promise<ResolvedBytes> {
  if (data.url) {
    return fetchUrlBytes(data.url, data.name);
  }
  if (data.base64) {
    const { bytes, contentType } = decodeBase64(data.base64);
    if (bytes.byteLength > MAX_BASE64_BYTES) {
      throw new Error(
        `base64 image too large (${bytes.byteLength} bytes > ${MAX_BASE64_BYTES}). Pass a 'url' instead.`
      );
    }
    return {
      bytes,
      filename: data.name || "upload",
      contentType: contentType || "application/octet-stream",
    };
  }
  throw new Error("Image upload requires either 'url' or 'base64' in data.");
}

/** Decode a bare base64 string or a base64 `data:` URI. Captures the data-URI MIME type when present. */
function decodeBase64(input: string): { bytes: Buffer; contentType?: string } {
  let b64 = input.trim();
  let contentType: string | undefined;

  const dataUri = b64.match(/^data:([^;,]*)(;base64)?,(.*)$/s);
  if (dataUri) {
    if (!dataUri[2]) {
      throw new Error("Only base64-encoded data: URIs are supported (missing ';base64').");
    }
    contentType = dataUri[1] || undefined;
    b64 = dataUri[3];
  }

  const bytes = Buffer.from(b64, "base64");
  if (bytes.byteLength === 0) {
    throw new Error("base64 image decoded to 0 bytes — input is empty or not valid base64.");
  }
  return { bytes, contentType };
}

async function fetchUrlBytes(url: string, name?: string): Promise<ResolvedBytes> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid image url: ${url}`);
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`Unsupported url protocol '${parsed.protocol}' — only http and https are allowed.`);
  }

  let res;
  try {
    res = await undiciRequest(url, { headersTimeout: 10_000, bodyTimeout: 30_000 });
  } catch (err) {
    throw new Error(
      `Failed to fetch image from url ${url}: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    );
  }

  if (res.statusCode < 200 || res.statusCode >= 300) {
    await res.body.dump();
    throw new Error(`Failed to fetch image from url ${url}: HTTP ${res.statusCode}`);
  }

  // Cheap early-out for honest servers; the streaming guard below is the real cap.
  const declared = Number(res.headers["content-length"]);
  if (Number.isFinite(declared) && declared > MAX_URL_DOWNLOAD_BYTES) {
    await res.body.dump();
    throw new Error(`Image at url too large (${declared} bytes > ${MAX_URL_DOWNLOAD_BYTES}).`);
  }

  // Stream with a running total so a missing/lying content-length can't buffer an unbounded body.
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of res.body) {
    total += chunk.length;
    if (total > MAX_URL_DOWNLOAD_BYTES) {
      res.body.destroy();
      throw new Error(`Image at url too large (exceeds ${MAX_URL_DOWNLOAD_BYTES} bytes).`);
    }
    chunks.push(chunk as Buffer);
  }
  const bytes = Buffer.concat(chunks);

  const ctHeader = res.headers["content-type"];
  const contentType = (typeof ctHeader === "string" ? ctHeader : "") || "application/octet-stream";
  const filename = name || basename(parsed.pathname) || "upload";
  return { bytes, filename, contentType };
}

export type UploadKind = "attachment" | "background";

/**
 * Build the multipart/form-data body Planka expects for an upload.
 * - attachment + type:'link' → `type` + `url` + `name` fields, no file part (the url is stored, not fetched).
 * - attachment + type:'file' / background → resolve bytes (fetch url or decode base64) and send a `file` part.
 */
export async function buildUploadForm(kind: UploadKind, data: UploadData): Promise<FormData> {
  const form = new FormData();

  if (kind === "attachment") {
    const type = data.type || "file";
    form.set("type", type);
    if (data.name) form.set("name", data.name);

    if (type === "link") {
      if (!data.url) throw new Error("link attachment requires a 'url' in data.");
      form.set("url", data.url);
      return form; // no file part for links
    }
  }

  const { bytes, filename, contentType } = await resolveBytes(data);
  form.set("file", new Blob([new Uint8Array(bytes)], { type: contentType }), filename);
  return form;
}
