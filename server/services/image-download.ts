import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { rsrSessionManager } from './rsr-session';

export interface ImageDownloadResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

class ImageDownloadService {
  private imageDirectory = join(process.cwd(), 'public', 'images', 'products');
  private downloadedImages = new Set<string>();

  constructor() {
    this.ensureImageDirectory();
  }

  private ensureImageDirectory() {
    if (!existsSync(this.imageDirectory)) {
      mkdirSync(this.imageDirectory, { recursive: true });
    }
  }

  /**
   * Download RSR image and store locally
   * Note: RSR images require age verification on their website
   */
  async downloadRSRImage(imageName: string, size: 'thumb' | 'standard' | 'large' = 'standard'): Promise<ImageDownloadResult> {
    // RSR images are not accessible due to age verification requirements
    // Return error to indicate images are not available
    return { 
      success: false, 
      error: "RSR images require age verification on their website" 
    };
  }

  /**
   * Download multiple image variants for a product
   */
  async downloadProductImages(imageName: string): Promise<{
    thumbnail?: string;
    standard?: string;
    large?: string;
    errors: string[];
  }> {
    const results = {
      thumbnail: undefined as string | undefined,
      standard: undefined as string | undefined,
      large: undefined as string | undefined,
      errors: [] as string[]
    };

    const sizes: Array<'thumb' | 'standard' | 'large'> = ['thumb', 'standard', 'large'];
    
    for (const size of sizes) {
      const result = await this.downloadRSRImage(imageName, size);
      
      if (result.success && result.localPath) {
        const sizeKey = size === 'thumb' ? 'thumbnail' : size;
        results[sizeKey] = result.localPath;
      } else {
        results.errors.push(`${size}: ${result.error}`);
      }
    }

    return results;
  }

  /**
   * Get RSR image URL based on their pattern
   */
  private getRSRImageUrl(imageName: string, size: 'thumb' | 'standard' | 'large'): string {
    const baseUrl = 'https://www.rsrgroup.com/images/inventory';
    
    switch (size) {
      case 'thumb':
        return `${baseUrl}/thumb/${imageName}.jpg`;
      case 'large':
        return `${baseUrl}/large/${imageName}.jpg`;
      case 'standard':
      default:
        return `${baseUrl}/${imageName}.jpg`;
    }
  }

  /**
   * Download with RSR authentication and age verification bypass
   */
  private async downloadWithAuth(url: string): Promise<Response> {
    // Use the sophisticated RSR session manager for age verification bypass
    const session = await rsrSessionManager.getAuthenticatedSession();
    
    return fetch(url, {
      headers: {
        'Cookie': session.cookies.join('; '),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.rsrgroup.com/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      redirect: 'follow'
    });
  }

  /**
   * Get local image path if exists
   */
  getLocalImagePath(imageName: string, size: 'thumb' | 'standard' | 'large' = 'standard'): string | null {
    const fileName = `${imageName}_${size}.jpg`;
    const localPath = join(this.imageDirectory, fileName);
    
    if (existsSync(localPath)) {
      return `/images/products/${fileName}`;
    }
    
    return null;
  }

  /**
   * Check if image exists locally
   */
  hasLocalImage(imageName: string, size: 'thumb' | 'standard' | 'large' = 'standard'): boolean {
    const fileName = `${imageName}_${size}.jpg`;
    const localPath = join(this.imageDirectory, fileName);
    return existsSync(localPath);
  }

  /**
   * Get download statistics
   */
  getDownloadStats(): {
    totalDownloaded: number;
    availableImages: string[];
  } {
    return {
      totalDownloaded: this.downloadedImages.size,
      availableImages: Array.from(this.downloadedImages)
    };
  }
}

export const imageDownloadService = new ImageDownloadService();