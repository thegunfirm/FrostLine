/**
 * Shared RSR Image Fetcher Service
 * Single source of truth for RSR image fetching logic used by both proxy and backfill
 */

import { rsrSessionManager } from "./rsr-session";

interface FetchOptions {
  sku: string;
  angle: number;
  size?: 'thumb' | 'standard' | 'highres';
  debug?: boolean;
}

interface FetchResult {
  success: boolean;
  buffer?: Buffer;
  status: number;
  error?: string;
  url: string;
}

class RSRImageFetcher {
  /**
   * Build RSR image URL based on SKU, angle, and size
   */
  buildUrl(sku: string, angle: number, size: 'thumb' | 'standard' | 'highres' = 'standard'): string {
    // Use RSR's documented naming convention: RSRSKU_imagenumber.jpg
    // Standard Images: AAC17-22G3_1.jpg, AAC17-22G3_2.jpg, AAC17-22G3_3.jpg  
    // High Resolution: AAC17-22G3_1_HR.jpg, AAC17-22G3_2_HR.jpg, AAC17-22G3_3_HR.jpg
    
    switch (size) {
      case 'thumb':
        return `https://img.rsrgroup.com/images/inventory/thumb/${sku}_${angle}.jpg`;
      case 'highres':
        return `https://img.rsrgroup.com/images/inventory/${sku}_${angle}_HR.jpg`;
      case 'standard':
      default:
        return `https://img.rsrgroup.com/pimages/${sku}_${angle}.jpg`;
    }
  }

  /**
   * Fetch RSR image using authenticated session
   */
  async fetch(options: FetchOptions): Promise<FetchResult> {
    const { sku, angle, size = 'standard', debug = false } = options;
    const rsrImageUrl = this.buildUrl(sku, angle, size);
    
    // Parse URL for debug logging
    const url = new URL(rsrImageUrl);
    const host = url.host;
    const path = url.pathname;

    let status = 0;
    let redirected = false;
    let error: string | undefined;
    let buffer: Buffer | undefined;

    try {
      // Use the existing RSR session manager
      buffer = await rsrSessionManager.downloadImage(rsrImageUrl);
      
      if (buffer && buffer.length > 1000) {
        status = 200;
      } else {
        status = 404;
        error = "Invalid or empty image";
        buffer = undefined;
      }
    } catch (err: any) {
      // Parse error for status code
      if (err.message.includes("404") || err.message.includes("Not Found")) {
        status = 404;
        error = "Not Found";
      } else if (err.message.includes("timeout")) {
        status = 0; // timeout has no HTTP status
        error = "Timeout";
      } else if (err.message.includes("302") || err.message.includes("redirect")) {
        status = 302;
        redirected = true;
        error = err.message;
      } else {
        status = 500;
        error = err.message;
      }
    }

    // Debug logging if enabled
    if (debug || process.env.RSR_IMAGE_DEBUG === "1") {
      console.log(
        `RSR_FETCH sku=${sku} angle=${angle} host=${host} path=${path} status=${status} redirected=${redirected ? 'yes' : 'no'}`
      );
    }

    return {
      success: status === 200 && !!buffer,
      buffer,
      status,
      error,
      url: rsrImageUrl
    };
  }
}

export const rsrImageFetcher = new RSRImageFetcher();