import { Request, Response } from 'express';
import { db } from '../db';
import { products } from '@shared/schema';
import { sql } from 'drizzle-orm';
import axios from 'axios';

interface ImageStatsResponse {
  bucket: string;
  prefix: string;
  scanned: number;
  cap: number;
  newestUploadedAt?: string;
  oldestUploadedAt?: string;
  distinctBaseSkus?: number;
  byAngle?: Record<string, number>;
  newestSamples?: Array<{ Key: string; LastModified: string }>;
  note?: string;
}

interface GapAnalysisResponse {
  totalActiveSkus: number;
  haveImagesCount: number;
  missingImagesCount: number;
  coveragePct: number;
  sampleMissingSkus: string[];
  bucketDistinctBaseSkus: number;
  bucketScanned: number;
  oldestUploadedAt: string;
  newestUploadedAt: string;
  note: string;
}

export async function rsrImageGapHandler(req: Request, res: Response) {
  try {
    const maxSkus = parseInt(req.query.maxSkus as string) || 100000;
    const skuListUrl = req.query.skuListUrl as string;

    let activeSkus: string[] = [];
    let source = '';

    // Try to get active SKUs from the database first
    try {
      const rsrProducts = await db
      .select()
      .from(products)
      .where(sql`rsr_stock_number IS NOT NULL AND rsr_stock_number != ''`)
      .limit(maxSkus);

      // Get unique SKUs
      const uniqueSkus = new Set<string>();
      rsrProducts.forEach(p => {
        // Check both possible field names (camelCase and snake_case)
        const rsrStockNumber = (p as any).rsrStockNumber || p.rsr_stock_number;
        if (rsrStockNumber) {
          uniqueSkus.add(rsrStockNumber);
        }
      });
      
      activeSkus = Array.from(uniqueSkus);
      source = 'database (products.rsr_stock_number)';
      
    } catch (dbError) {
      console.error('Failed to fetch from database:', dbError);
      
      // If database fails and skuListUrl provided, try that
      if (skuListUrl) {
        try {
          const response = await axios.get(skuListUrl, { timeout: 30000 });
          const lines = response.data.split('\n');
          const skuSet = new Set<string>();
          
          // Parse CSV/TSV - look for sku column
          const firstLine = lines[0].toLowerCase();
          const delimiter = firstLine.includes('\t') ? '\t' : ',';
          const headers = firstLine.split(delimiter).map((h: string) => h.trim());
          const skuIndex = headers.findIndex((h: string) => h === 'sku' || h === 'stock_number' || h === 'rsr_stock_number');
          
          if (skuIndex === -1) {
            throw new Error('No sku column found in CSV/TSV');
          }
          
          for (let i = 1; i < lines.length && skuSet.size < maxSkus; i++) {
            const cols = lines[i].split(delimiter);
            if (cols[skuIndex]) {
              skuSet.add(cols[skuIndex].trim());
            }
          }
          
          activeSkus = Array.from(skuSet);
          source = `external URL (${skuListUrl})`;
        } catch (urlError) {
          console.error('Failed to fetch from URL:', urlError);
        }
      }
    }

    // If no SKUs found from any source
    if (activeSkus.length === 0) {
      return res.status(400).json({
        error: 'No SKU source available',
        message: 'Could not fetch SKUs from database and no skuListUrl provided'
      });
    }

    // Call our own /api/rsr-image-stats endpoint to get bucket info
    const statsUrl = `http://localhost:${process.env.PORT || 5000}/api/rsr-image-stats?max=100000`;
    const statsResponse = await axios.get<ImageStatsResponse>(statsUrl, { timeout: 60000 });
    const bucketStats = statsResponse.data;

    // Get the list of base SKUs from bucket by parsing the newestSamples and calling again if needed
    // For efficiency, we'll estimate based on the distinctBaseSkus count from the stats
    const bucketDistinctSkus = bucketStats.distinctBaseSkus || 0;

    // To get actual bucket SKUs, we need to list them from S3
    // But since the stats endpoint already scans all, we'll use a simplified approach
    // We'll assume the bucket contains images for the SKUs it has
    
    // For a more accurate gap analysis, let's fetch the actual keys
    // We'll use the same S3 client approach as the stats endpoint
    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      endpoint: process.env.HETZNER_S3_ENDPOINT,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.HETZNER_S3_KEY || '',
        secretAccessKey: process.env.HETZNER_S3_SECRET || ''
      },
      forcePathStyle: true
    });

    // Collect all base SKUs from bucket
    const bucketBaseSkus = new Set<string>();
    let continuationToken: string | undefined;
    let scanned = 0;
    const maxScan = 100000;

    const bucket = process.env.HETZNER_S3_BUCKET || 'tgf-images';
    const prefix = 'rsr/highres/';
    
    while (scanned < maxScan) {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken
      });

      const listResponse = await s3Client.send(listCommand);
      
      if (!listResponse.Contents) break;

      for (const obj of listResponse.Contents) {
        if (!obj.Key) continue;
        
        // Extract base SKU from key like "rsr/highres/GLUX4350204FRNMOOSKY_1_HR.jpg"
        const filename = obj.Key.split('/').pop() || '';
        const match = filename.match(/^(.*)_(\d+)_HR\.\w+$/);
        if (match) {
          bucketBaseSkus.add(match[1]);
        }
        scanned++;
      }

      if (!listResponse.IsTruncated) break;
      continuationToken = listResponse.NextContinuationToken;
      
      if (scanned >= maxScan) break;
    }

    // Now compare active SKUs with bucket SKUs
    const haveImages = new Set<string>();
    const missingSkus = new Set<string>();

    for (const sku of activeSkus) {
      // Normalize SKU to match bucket naming convention
      // RSR SKUs are typically used as-is in the bucket
      const normalizedSku = sku.toUpperCase();
      
      if (bucketBaseSkus.has(normalizedSku)) {
        haveImages.add(sku);
      } else {
        missingSkus.add(sku);
      }
    }

    // Calculate coverage
    const coveragePct = activeSkus.length > 0 
      ? Math.round((haveImages.size / activeSkus.length) * 1000) / 10 
      : 0;

    // Get sample of missing SKUs
    const sampleMissingSkus = Array.from(missingSkus).slice(0, 25);

    const response: GapAnalysisResponse = {
      totalActiveSkus: activeSkus.length,
      haveImagesCount: haveImages.size,
      missingImagesCount: missingSkus.size,
      coveragePct,
      sampleMissingSkus,
      bucketDistinctBaseSkus: bucketBaseSkus.size,
      bucketScanned: scanned,
      oldestUploadedAt: bucketStats.oldestUploadedAt || '',
      newestUploadedAt: bucketStats.newestUploadedAt || '',
      note: `Source: ${source}. Scanned ${scanned} bucket objects, found ${bucketBaseSkus.size} distinct base SKUs.`
    };

    res.json(response);
    
  } catch (error) {
    console.error('Error in RSR image gap analysis:', error);
    res.status(500).json({ 
      error: 'Failed to analyze RSR image gap',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}