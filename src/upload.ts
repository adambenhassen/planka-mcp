import { request as undiciRequest } from "undici";
import { basename } from "node:path";

/** Max decoded size for the base64 fallback (~1 MB). base64 args are LLM-emitted and expensive. */
export const MAX_BASE64_BYTES = 1 * 1024 * 1024;
/** Max size we will download from a url, so a bad link can't pull an unbounded blob into memory. */
export const MAX_URL_DOWNLOAD_BYTES = 10 * 1024 * 1024;

export interface UploadData {
  /** For type:'file' uploads: where to fetch bytes from. For type:'link' attachments: the link target (not fetched). */
  url?: string;
  /** Capped base64 fallback for tiny images. */
  base64?: string;
  /** Attachment/file name. */
  name?: string;
  /** Attachment type; 'link' attachments carry a url but no file part. */
  type?: string;
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
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_BASE64_BYTES) {
      throw new Error(
        `base64 image too large (${bytes.byteLength} bytes > ${MAX_BASE64_BYTES}). Pass a 'url' instead.`
      );
    }
    return { bytes, filename: data.name || "upload", contentType: "application/octet-stream" };
  }
  throw new Error("Image upload requires either 'url' or 'base64' in data.");
}

async function fetchUrlBytes(url: string, name?: string): Promise<ResolvedBytes> {
  // placeholder — implemented in Task 3
  throw new Error("not implemented");
}
