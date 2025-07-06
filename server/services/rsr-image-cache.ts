import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * RSR Image Cache Service
 * Stores RSR images locally to avoid repeated age verification challenges
 */
class RSRImageCacheService {
  private cacheDirectory = join(process.cwd(), 'public', 'cache', 'rsr-images');
  private indexFile = join(this.cacheDirectory, 'index.json');
  private imageIndex: Record<string, { url: string; cached: boolean; lastAttempt: number }> = {};

  constructor() {
    this.ensureCacheDirectory();
    this.loadImageIndex();
  }

  private ensureCacheDirectory() {
    if (!existsSync(this.cacheDirectory)) {
      mkdirSync(this.cacheDirectory, { recursive: true });
    }
  }

  private loadImageIndex() {
    if (existsSync(this.indexFile)) {
      try {
        const data = readFileSync(this.indexFile, 'utf8');
        this.imageIndex = JSON.parse(data);
      } catch (error) {
        console.error('Failed to load image index:', error);
        this.imageIndex = {};
      }
    }
  }

  private saveImageIndex() {
    try {
      writeFileSync(this.indexFile, JSON.stringify(this.imageIndex, null, 2));
    } catch (error) {
      console.error('Failed to save image index:', error);
    }
  }

  /**
   * Get cached image path if available
   */
  getCachedImagePath(stockNo: string, size: 'thumb' | 'standard' | 'large'): string | null {
    const key = `${stockNo}_${size}`;
    const entry = this.imageIndex[key];
    
    if (entry && entry.cached) {
      const imagePath = join(this.cacheDirectory, `${key}.jpg`);
      if (existsSync(imagePath)) {
        return imagePath;
      }
    }
    
    return null;
  }

  /**
   * Check if we should attempt to fetch an image
   */
  shouldAttemptFetch(stockNo: string, size: 'thumb' | 'standard' | 'large'): boolean {
    const key = `${stockNo}_${size}`;
    const entry = this.imageIndex[key];
    
    // If no entry, attempt fetch
    if (!entry) return true;
    
    // If already cached, no need to fetch
    if (entry.cached) return false;
    
    // If last attempt was more than 1 hour ago, try again
    const oneHour = 60 * 60 * 1000;
    return (Date.now() - entry.lastAttempt) > oneHour;
  }

  /**
   * Mark image as attempted
   */
  markAttempted(stockNo: string, size: 'thumb' | 'standard' | 'large', success: boolean, imageData?: Buffer) {
    const key = `${stockNo}_${size}`;
    
    this.imageIndex[key] = {
      url: this.getRSRImageUrl(stockNo, size),
      cached: success,
      lastAttempt: Date.now()
    };
    
    if (success && imageData) {
      const imagePath = join(this.cacheDirectory, `${key}.jpg`);
      try {
        writeFileSync(imagePath, imageData);
        console.log(`Cached RSR image: ${key}`);
      } catch (error) {
        console.error(`Failed to cache image ${key}:`, error);
        this.imageIndex[key].cached = false;
      }
    }
    
    this.saveImageIndex();
  }

  /**
   * Generate RSR image URL
   */
  private getRSRImageUrl(stockNo: string, size: 'thumb' | 'standard' | 'large'): string {
    const baseUrl = 'https://www.rsrgroup.com/images/inventory';
    
    switch (size) {
      case 'thumb':
        return `${baseUrl}/thumb/${stockNo}.jpg`;
      case 'large':
        return `${baseUrl}/large/${stockNo}.jpg`;
      case 'standard':
      default:
        return `${baseUrl}/${stockNo}.jpg`;
    }
  }

  /**
   * Get public URL for cached image
   */
  getCachedImageUrl(stockNo: string, size: 'thumb' | 'standard' | 'large'): string | null {
    const key = `${stockNo}_${size}`;
    const entry = this.imageIndex[key];
    
    if (entry && entry.cached) {
      return `/cache/rsr-images/${key}.jpg`;
    }
    
    return null;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { total: number; cached: number; success_rate: number } {
    const entries = Object.values(this.imageIndex);
    const total = entries.length;
    const cached = entries.filter(e => e.cached).length;
    const success_rate = total > 0 ? (cached / total) * 100 : 0;
    
    return { total, cached, success_rate };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.imageIndex = {};
    this.saveImageIndex();
  }

  /**
   * Clear attempt history to allow immediate retry
   */
  clearAttemptHistory() {
    for (const key in this.imageIndex) {
      if (this.imageIndex[key] && !this.imageIndex[key].cached) {
        delete this.imageIndex[key];
      }
    }
    this.saveImageIndex();
  }
}

export const rsrImageCache = new RSRImageCacheService();