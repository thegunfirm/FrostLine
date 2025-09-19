/**
 * Shared RSR Image Fetcher Service
 * Single source of truth for RSR image fetching logic used by both proxy and backfill
 */

import { rsrSessionManager } from "./rsr-session";

type SizeMode = 'hr' | 'std' | 'auto';
type Source = 'hr' | 'std' | 'none';

interface FetchOptions {
  sku: string;
  angle: number;
  sizeMode?: SizeMode;
  debug?: boolean;
}

interface FetchResult {
  success: boolean;
  buffer?: Buffer;
  status: number;
  error?: string;
  url: string;
  source: Source;
}

class RSRImageFetcher {
  /**
   * Build RSR image URL based on SKU, angle, and size
   */
  private buildUrl(sku: string, angle: number, highres: boolean): string {
    if (highres) {
      // High Resolution: AAC17-22G3_1_HR.jpg, AAC17-22G3_2_HR.jpg, AAC17-22G3_3_HR.jpg
      return `https://img.rsrgroup.com/images/inventory/${sku}_${angle}_HR.jpg`;
    } else {
      // Standard Images: AAC17-22G3_1.jpg, AAC17-22G3_2.jpg, AAC17-22G3_3.jpg  
      return `https://img.rsrgroup.com/pimages/${sku}_${angle}.jpg`;
    }
  }

  /**
   * Attempt to fetch an image from a specific URL
   */
  private async attemptFetch(url: string, sku: string, angle: number, source: Source): Promise<{
    buffer?: Buffer;
    status: number;
    error?: string;
  }> {
    const urlObj = new URL(url);
    const host = urlObj.host;
    const path = urlObj.pathname;
    
    let status = 0;
    let error: string | undefined;
    let buffer: Buffer | undefined;

    try {
      buffer = await rsrSessionManager.downloadImage(url);
      
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
        error = err.message;
      } else {
        status = 500;
        error = err.message;
      }
    }

    // Debug logging
    if (process.env.RSR_IMAGE_DEBUG === "1") {
      console.log(
        `RSR_FETCH sku=${sku} angle=${angle} source=${source} host=${host} path=${path} status=${status}`
      );
    }

    return { buffer, status, error };
  }

  /**
   * Fetch RSR image using authenticated session with auto fallback
   */
  async fetch(options: FetchOptions): Promise<FetchResult> {
    const { sku, angle, sizeMode = 'auto', debug = false } = options;
    
    // Override debug from environment
    const enableDebug = debug || process.env.RSR_IMAGE_DEBUG === '1';
    
    if (sizeMode === 'std') {
      // Standard size only
      const url = this.buildUrl(sku, angle, false);
      const result = await this.attemptFetch(url, sku, angle, 'std');
      return {
        success: result.status === 200 && !!result.buffer,
        buffer: result.buffer,
        status: result.status,
        error: result.error,
        url,
        source: result.status === 200 ? 'std' : 'none'
      };
    } else if (sizeMode === 'hr') {
      // High-res only
      const url = this.buildUrl(sku, angle, true);
      const result = await this.attemptFetch(url, sku, angle, 'hr');
      return {
        success: result.status === 200 && !!result.buffer,
        buffer: result.buffer,
        status: result.status,
        error: result.error,
        url,
        source: result.status === 200 ? 'hr' : 'none'
      };
    } else {
      // Auto mode: try high-res first, then standard
      const hrUrl = this.buildUrl(sku, angle, true);
      const hrResult = await this.attemptFetch(hrUrl, sku, angle, 'hr');
      
      if (hrResult.status === 200 && hrResult.buffer) {
        return {
          success: true,
          buffer: hrResult.buffer,
          status: 200,
          url: hrUrl,
          source: 'hr'
        };
      }
      
      // If high-res failed with 404, try standard
      if (hrResult.status === 404) {
        const stdUrl = this.buildUrl(sku, angle, false);
        const stdResult = await this.attemptFetch(stdUrl, sku, angle, 'std');
        
        if (stdResult.status === 200 && stdResult.buffer) {
          return {
            success: true,
            buffer: stdResult.buffer,
            status: 200,
            url: stdUrl,
            source: 'std'
          };
        }
        
        // Both failed, return standard result
        return {
          success: false,
          buffer: stdResult.buffer,
          status: stdResult.status,
          error: stdResult.error,
          url: stdUrl,
          source: 'none'
        };
      }
      
      // High-res failed with non-404, return that error
      return {
        success: false,
        buffer: hrResult.buffer,
        status: hrResult.status,
        error: hrResult.error,
        url: hrUrl,
        source: 'none'
      };
    }
  }
}

export const rsrImageFetcher = new RSRImageFetcher();