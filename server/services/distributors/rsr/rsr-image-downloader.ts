/**
 * RSR Image Downloader Service
 * Downloads product images from RSR FTP server and caches them locally
 */

import { RSRFTPClient } from './rsr-ftp-client';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class RSRImageDownloader {
  private ftpClient: RSRFTPClient;
  private imageCache: string;

  constructor() {
    this.ftpClient = new RSRFTPClient();
    this.imageCache = join(process.cwd(), 'server', 'data', 'rsr-images');
    
    // Create cache directory if it doesn't exist
    if (!existsSync(this.imageCache)) {
      mkdirSync(this.imageCache, { recursive: true });
    }
  }

  /**
   * Download RSR product image from FTP server
   */
  async downloadProductImage(stockNo: string, imageNumber: number = 1, resolution: 'standard' | 'highres' = 'standard'): Promise<string | null> {
    try {
      // RSR image naming convention: RSRSKU_imagenumber.jpg or RSRSKU_imagenumber_HR.jpg
      const fileName = resolution === 'highres' 
        ? `${stockNo}_${imageNumber}_HR.jpg`
        : `${stockNo}_${imageNumber}.jpg`;
      
      const localPath = join(this.imageCache, fileName);
      
      // Check if image already cached
      if (existsSync(localPath)) {
        console.log(`📁 Using cached RSR image: ${fileName}`);
        return localPath;
      }
      
      // Connect to RSR FTP
      await this.ftpClient.connect();
      
      // RSR FTP images are organized by first letter of stock number
      const firstLetter = stockNo.charAt(0).toLowerCase();
      const ftpPath = resolution === 'highres' 
        ? `/ftp_highres_images/rsr_number/${firstLetter}/${fileName}`
        : `/ftp_images/rsr_number/${firstLetter}/${fileName}`;
      
      console.log(`📥 Downloading RSR image: ${ftpPath}`);
      
      const imageBuffer = await this.ftpClient.downloadFile(ftpPath);
      
      if (imageBuffer && imageBuffer.length > 1000) {
        // Save to local cache
        writeFileSync(localPath, imageBuffer);
        console.log(`✅ RSR image downloaded: ${fileName} (${imageBuffer.length} bytes)`);
        
        await this.ftpClient.disconnect();
        return localPath;
      } else {
        console.log(`❌ RSR image not available or too small: ${fileName}`);
        await this.ftpClient.disconnect();
        return null;
      }
      
    } catch (error: any) {
      console.error(`Error downloading RSR image ${stockNo}:`, error.message);
      await this.ftpClient.disconnect();
      return null;
    }
  }

  /**
   * Download multiple views of a product
   */
  async downloadProductImages(stockNo: string, maxViews: number = 3, resolution: 'standard' | 'highres' = 'standard'): Promise<string[]> {
    const downloadedImages: string[] = [];
    
    for (let i = 1; i <= maxViews; i++) {
      const imagePath = await this.downloadProductImage(stockNo, i, resolution);
      if (imagePath) {
        downloadedImages.push(imagePath);
      }
    }
    
    return downloadedImages;
  }

  /**
   * Batch download images for multiple products
   */
  async batchDownloadImages(stockNos: string[], resolution: 'standard' | 'highres' = 'standard'): Promise<Record<string, string[]>> {
    const results: Record<string, string[]> = {};
    
    for (const stockNo of stockNos) {
      console.log(`📥 Downloading images for ${stockNo}...`);
      results[stockNo] = await this.downloadProductImages(stockNo, 3, resolution);
    }
    
    return results;
  }
}