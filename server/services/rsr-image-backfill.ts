/**
 * RSR Image Backfill Service
 * Resumable, concurrent backfill of RSR product images to Hetzner S3 bucket
 */

import { db } from "../db";
import { products } from "@shared/schema";
import { sql } from "drizzle-orm";
import { rsrSessionManager } from "./rsr-session";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

// Initialize S3 client for Hetzner Object Storage
const s3 = new S3Client({
  region: process.env.HETZNER_S3_REGION || "nbg1",
  endpoint: process.env.HETZNER_S3_ENDPOINT || "https://nbg1.your-objectstorage.com",
  credentials: {
    accessKeyId: process.env.HETZNER_S3_ACCESS_KEY!,
    secretAccessKey: process.env.HETZNER_S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

interface BackfillStatus {
  startedAt: string;
  lastUpdateAt: string;
  scannedSkus: number;
  attemptedDownloads: number;
  uploaded: number;
  skippedExists: number;
  noRemote: number;
  errorsTotal: number;
  errorsByCode: Record<string, number>;
  anglesPlanned: string;
  concurrency: number;
  checkpoint: {
    lastSku: string | null;
    completedAngles: number[];
  };
  etaSkusRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
}

interface BackfillOptions {
  limitSkus?: number;
  angles?: string;
  concurrency?: number;
  onlyMissing?: boolean;
  dryRun?: boolean;
}

class RSRImageBackfillService {
  private status: BackfillStatus;
  private checkpointFile: string;
  private isRunning: boolean = false;
  private shouldPause: boolean = false;
  private activeDownloads: Set<string> = new Set();

  constructor() {
    this.checkpointFile = join(process.cwd(), "server", "data", "rsr-backfill-checkpoint.json");
    this.status = this.loadCheckpoint();
  }

  private loadCheckpoint(): BackfillStatus {
    if (existsSync(this.checkpointFile)) {
      try {
        const data = readFileSync(this.checkpointFile, "utf-8");
        const checkpoint = JSON.parse(data);
        console.log("📥 Loaded checkpoint:", checkpoint.checkpoint);
        return checkpoint;
      } catch (error) {
        console.log("⚠️ Could not load checkpoint, starting fresh");
      }
    }

    return {
      startedAt: new Date().toISOString(),
      lastUpdateAt: new Date().toISOString(),
      scannedSkus: 0,
      attemptedDownloads: 0,
      uploaded: 0,
      skippedExists: 0,
      noRemote: 0,
      errorsTotal: 0,
      errorsByCode: {},
      anglesPlanned: "1-3",
      concurrency: 3,
      checkpoint: {
        lastSku: null,
        completedAngles: [],
      },
      etaSkusRemaining: 0,
      isRunning: false,
      isPaused: false,
    };
  }

  private saveCheckpoint(): void {
    try {
      writeFileSync(this.checkpointFile, JSON.stringify(this.status, null, 2));
    } catch (error) {
      console.error("❌ Failed to save checkpoint:", error);
    }
  }

  private parseAngles(anglesStr: string): number[] {
    // Support formats: "1-3", "1-4", "1,2,3"
    if (anglesStr.includes("-")) {
      const [start, end] = anglesStr.split("-").map(Number);
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    } else if (anglesStr.includes(",")) {
      return anglesStr.split(",").map(Number);
    } else {
      return [Number(anglesStr) || 1];
    }
  }

  async run(options: BackfillOptions = {}): Promise<BackfillStatus> {
    if (this.isRunning) {
      console.log("⚠️ Backfill already running");
      return this.status;
    }

    const {
      limitSkus = 2000,
      angles = "1-3",
      concurrency = 3,
      onlyMissing = true,
      dryRun = false,
    } = options;

    console.log("🚀 Starting RSR image backfill:", { limitSkus, angles, concurrency, onlyMissing, dryRun });

    // Reset or continue from checkpoint
    if (!this.status.checkpoint.lastSku) {
      this.status = {
        ...this.status,
        startedAt: new Date().toISOString(),
        scannedSkus: 0,
        attemptedDownloads: 0,
        uploaded: 0,
        skippedExists: 0,
        noRemote: 0,
        errorsTotal: 0,
        errorsByCode: {},
        anglesPlanned: angles,
        concurrency: Math.min(concurrency, 6),
      };
    } else {
      console.log(`📍 Resuming from SKU: ${this.status.checkpoint.lastSku}`);
    }

    this.isRunning = true;
    this.shouldPause = false;
    this.status.isRunning = true;
    this.status.isPaused = false;

    // Get active RSR SKUs from database
    let query = db
      .select()
      .from(products)
      .where(sql`rsr_stock_number IS NOT NULL AND rsr_stock_number != ''`);

    // If resuming, continue from last SKU
    if (this.status.checkpoint.lastSku) {
      query = query.where(sql`rsr_stock_number > ${this.status.checkpoint.lastSku}`);
    }

    const rsrProducts = await query.limit(limitSkus);

    // Extract unique SKUs
    const uniqueSkus = new Set<string>();
    rsrProducts.forEach((p) => {
      const rsrStockNumber = (p as any).rsrStockNumber || p.rsr_stock_number;
      if (rsrStockNumber) {
        uniqueSkus.add(rsrStockNumber);
      }
    });

    const skuList = Array.from(uniqueSkus);
    this.status.etaSkusRemaining = skuList.length;

    console.log(`📊 Found ${skuList.length} SKUs to process`);

    if (dryRun) {
      console.log("🏃 DRY RUN MODE - No downloads will be performed");
      this.status.scannedSkus = skuList.length;
      this.isRunning = false;
      this.status.isRunning = false;
      this.saveCheckpoint();
      return this.status;
    }

    // Process SKUs with concurrency control
    const anglesToProcess = this.parseAngles(angles);
    const batchSize = concurrency;
    
    for (let i = 0; i < skuList.length; i += batchSize) {
      if (this.shouldPause) {
        console.log("⏸️ Backfill paused by user");
        break;
      }

      const batch = skuList.slice(i, Math.min(i + batchSize, skuList.length));
      const promises = batch.map((sku) => this.processSku(sku, anglesToProcess, onlyMissing));
      
      await Promise.allSettled(promises);

      // Update checkpoint every 200 SKUs or at end of batch
      if ((i + batchSize) % 200 === 0 || i + batchSize >= skuList.length) {
        this.status.checkpoint.lastSku = batch[batch.length - 1];
        this.saveCheckpoint();
        console.log(`💾 Checkpoint saved at SKU: ${this.status.checkpoint.lastSku}`);
      }

      this.status.etaSkusRemaining = Math.max(0, skuList.length - (i + batchSize));
      this.status.lastUpdateAt = new Date().toISOString();
    }

    this.isRunning = false;
    this.status.isRunning = false;
    this.status.isPaused = this.shouldPause;
    this.saveCheckpoint();

    console.log("✅ Backfill completed:", {
      scanned: this.status.scannedSkus,
      uploaded: this.status.uploaded,
      skipped: this.status.skippedExists,
      noRemote: this.status.noRemote,
      errors: this.status.errorsTotal,
    });

    return this.status;
  }

  private async processSku(sku: string, angles: number[], onlyMissing: boolean): Promise<void> {
    this.status.scannedSkus++;

    for (const angle of angles) {
      // Skip if already processed in checkpoint
      if (this.status.checkpoint.lastSku === sku && this.status.checkpoint.completedAngles.includes(angle)) {
        continue;
      }

      try {
        await this.processImage(sku, angle, onlyMissing);
      } catch (error: any) {
        console.error(`❌ Failed to process ${sku}_${angle}:`, error.message);
        this.incrementError(error.code || "unknown");
      }
    }
  }

  private async processImage(sku: string, angle: number, onlyMissing: boolean): Promise<void> {
    // Always use canonical HR key for S3 storage, even if source was standard
    const s3Key = `rsr/highres/${sku}_${angle}_HR.jpg`;

    // Check if image already exists in S3
    if (onlyMissing) {
      try {
        await s3.send(
          new HeadObjectCommand({
            Bucket: process.env.HETZNER_S3_BUCKET!,
            Key: s3Key,
          })
        );
        this.status.skippedExists++;
        console.log(`⏭️ Skipped (exists): ${s3Key}`);
        return;
      } catch (error) {
        // Image doesn't exist, proceed with download
      }
    }

    this.status.attemptedDownloads++;

    // Download from RSR with retries using shared fetcher with auto fallback
    const { rsrImageFetcher } = await import('./rsr-image-fetcher.js');
    let imageBuffer: Buffer | null = null;
    let imageSource: string | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !imageBuffer) {
      attempts++;
      
      try {
        // Use shared fetcher with auto mode and timeout wrapper
        const fetchPromise = rsrImageFetcher.fetch({
          sku,
          angle,
          sizeMode: 'auto', // Auto fallback: try HR first, then standard
          debug: process.env.RSR_IMAGE_DEBUG === '1'
        });
        
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Download timeout")), 30000)
        );
        
        const result = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (result.success && result.buffer && result.buffer.length > 1000) {
          imageBuffer = result.buffer;
          imageSource = result.source;
        } else if (result.status === 404) {
          this.status.noRemote++;
          return;
        } else {
          throw new Error(result.error || "Invalid or empty image");
        }
        
      } catch (error: any) {
        if (error.message === "Download timeout") {
          this.incrementError("timeout");
          if (attempts < maxAttempts) {
            // Exponential backoff with jitter
            const delay = Math.pow(2, attempts) * 1000 + Math.random() * 1000;
            console.log(`⏳ Retry ${attempts}/${maxAttempts} for ${sku}_${angle} in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            return;
          }
        } else {
          throw error;
        }
      }
    }

    if (!imageBuffer) {
      this.incrementError("max_retries");
      return;
    }

    // Upload to S3 with canonical HR key
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.HETZNER_S3_BUCKET!,
          Key: s3Key,
          Body: imageBuffer,
          ContentType: "image/jpeg",
          CacheControl: "public, max-age=31536000", // 1 year cache
        })
      );
      
      this.status.uploaded++;
      console.log(`✅ Uploaded: ${s3Key} (${imageBuffer.length} bytes, source=${imageSource})`);
    } catch (error: any) {
      console.error(`❌ S3 upload failed for ${s3Key}:`, error.message || error.name || 'Unknown error');
      console.error('S3 Error details:', {
        name: error.name,
        message: error.message,
        code: error.Code || error.code,
        statusCode: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId
      });
      this.incrementError("s3_upload");
    }
  }

  private incrementError(code: string): void {
    this.status.errorsTotal++;
    this.status.errorsByCode[code] = (this.status.errorsByCode[code] || 0) + 1;
  }

  getStatus(): BackfillStatus {
    return { ...this.status };
  }

  pause(): void {
    if (this.isRunning) {
      console.log("🛑 Pause requested, will stop after current batch");
      this.shouldPause = true;
    }
  }

  reset(): void {
    if (this.isRunning) {
      console.log("⚠️ Cannot reset while running");
      return;
    }
    
    if (existsSync(this.checkpointFile)) {
      unlinkSync(this.checkpointFile);
    }
    
    this.status = this.loadCheckpoint();
    console.log("🔄 Backfill status reset");
  }
}

export const rsrImageBackfill = new RSRImageBackfillService();