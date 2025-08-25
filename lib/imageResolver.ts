import { s3 } from "./s3";
import { HeadObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.HETZNER_S3_BUCKET!;
const BASE = process.env.IMAGE_BASE_URL!;
const USE_BUCKET = process.env.USE_BUCKET_IMAGES === "true";

// Map current RSR-style URLs/filenames → bucket key (no DB change)
export function mapToBucketKey(input: string): string | null {
  // Matches: AAC17-22G3_1.jpg (from URL or filename)
  const m = input.match(/([A-Z0-9-]+)_(\d+)\.(jpg|jpeg|png|webp)$/i);
  if (!m) return null;
  const [, stock, idx, ext] = m;
  return `rsr/standard/${stock}_${idx}.${ext.toLowerCase()}`;
}

async function exists(Key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key }));
    return true;
  } catch {
    return false;
  }
}

/** Returns a safe URL: bucket URL if present; else original */
export async function resolveImageUrl(originalUrl: string): Promise<string> {
  if (!USE_BUCKET) return originalUrl;
  const key = mapToBucketKey(originalUrl);
  if (!key) return originalUrl;
  if (await exists(key)) return `${BASE}/${key}`;
  return originalUrl;
}