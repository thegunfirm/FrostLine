/**
 * Sync Health Monitor Service
 * Provides real-time status monitoring for RSR and Algolia sync processes
 */

import { db } from '../db';
import { products } from '@shared/schema';
import { eq, count } from 'drizzle-orm';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

export interface SyncHealthStatus {
  rsr: {
    lastSync: string;
    totalProducts: number;
    dropShippableCount: number;
    warehouseOnlyCount: number;
    isRunning: boolean;
    progress: number;
    errors: string[];
    lastError: string;
  };
  algolia: {
    lastSync: string;
    indexedProducts: number;
    isRunning: boolean;
    progress: number;
    errors: string[];
    lastError: string;
  };
  system: {
    uptimeMinutes: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

class SyncHealthMonitor {
  private statusFile = join(process.cwd(), 'sync-status.json');
  private logFile = join(process.cwd(), 'sync-log.txt');
  private algoliaClient: any;
  private processStartTime = new Date();

  constructor() {
    // Initialize Algolia client - will be loaded dynamically when needed
    this.algoliaClient = null;
  }

  async getSyncHealthStatus(): Promise<SyncHealthStatus> {
    const [rsrStatus, algoliaStatus, systemStatus] = await Promise.all([
      this.getRSRStatus(),
      this.getAlgoliaStatus(),
      this.getSystemStatus()
    ]);

    return {
      rsr: rsrStatus,
      algolia: algoliaStatus,
      system: systemStatus
    };
  }

  private async getRSRStatus() {
    try {
      // Get database counts
      const [totalResult] = await db.select({ count: count() }).from(products);
      const [dropShippableResult] = await db.select({ count: count() }).from(products)
        .where(eq(products.dropShippable, true));
      const [warehouseOnlyResult] = await db.select({ count: count() }).from(products)
        .where(eq(products.dropShippable, false));

      // Check for running processes
      const isRunning = await this.checkRSRProcessRunning();
      
      // Get last sync info
      const lastSync = await this.getLastSyncTime('rsr');
      
      // Get progress and errors
      const { progress, errors, lastError } = await this.parseLogFile();

      return {
        lastSync: lastSync,
        totalProducts: totalResult.count,
        dropShippableCount: dropShippableResult.count,
        warehouseOnlyCount: warehouseOnlyResult.count,
        isRunning: isRunning,
        progress: progress,
        errors: errors,
        lastError: lastError
      };
    } catch (error) {
      console.error('Error getting RSR status:', error);
      return {
        lastSync: new Date().toISOString(),
        totalProducts: 0,
        dropShippableCount: 0,
        warehouseOnlyCount: 0,
        isRunning: false,
        progress: 0,
        errors: [error.message],
        lastError: error.message
      };
    }
  }

  private async getAlgoliaStatus() {
    try {
      let indexedProducts = 0;
      let lastSync = new Date().toISOString();
      let isRunning = false;
      let progress = 0;
      let errors: string[] = [];
      let lastError = '';

      // Try to get Algolia stats
      try {
        const { algoliasearch } = await import('algoliasearch');
        
        if (process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_API_KEY) {
          const client = algoliasearch(
            process.env.ALGOLIA_APP_ID,
            process.env.ALGOLIA_API_KEY
          );
          
          const searchResult = await client.searchSingleIndex({
            indexName: 'products',
            searchParams: {
              query: '',
              hitsPerPage: 0,
              attributesToRetrieve: []
            }
          });
          indexedProducts = searchResult.nbHits;
          
          // Check if Algolia sync is running
          isRunning = await this.checkAlgoliaProcessRunning();
          
          if (isRunning) {
            progress = await this.getAlgoliaProgress();
          }
        } else {
          errors.push('Algolia credentials not configured');
          lastError = 'Algolia credentials missing';
        }
      } catch (algoliaError) {
        errors.push(`Algolia API error: ${algoliaError.message}`);
        lastError = algoliaError.message;
      }

      return {
        lastSync,
        indexedProducts,
        isRunning,
        progress,
        errors,
        lastError
      };
    } catch (error) {
      return {
        lastSync: new Date().toISOString(),
        indexedProducts: 0,
        isRunning: false,
        progress: 0,
        errors: [error.message],
        lastError: error.message
      };
    }
  }

  private async getSystemStatus() {
    const uptimeMinutes = Math.floor((new Date().getTime() - this.processStartTime.getTime()) / 60000);
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryPercent = Math.round((memoryUsage.rss / (1024 * 1024 * 1024)) * 100); // Convert to GB and get percentage
    
    // Simulate disk usage (in a real implementation, you'd use fs.statSync)
    const diskUsage = 45; // Placeholder percentage
    
    return {
      uptimeMinutes,
      memoryUsage: memoryPercent,
      diskUsage
    };
  }

  private async checkRSRProcessRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      const ps = spawn('ps', ['aux']);
      let output = '';
      
      ps.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ps.on('close', () => {
        const isRunning = output.includes('complete-rsr-sync') || 
                         output.includes('automated-rsr-sync') ||
                         output.includes('sync-monitor');
        resolve(isRunning);
      });
      
      ps.on('error', () => {
        resolve(false);
      });
    });
  }

  private async checkAlgoliaProcessRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      const ps = spawn('ps', ['aux']);
      let output = '';
      
      ps.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ps.on('close', () => {
        const isRunning = output.includes('algolia-sync') || 
                         output.includes('complete-algolia-sync');
        resolve(isRunning);
      });
      
      ps.on('error', () => {
        resolve(false);
      });
    });
  }

  private async getLastSyncTime(type: 'rsr' | 'algolia'): Promise<string> {
    try {
      if (existsSync(this.statusFile)) {
        const status = JSON.parse(readFileSync(this.statusFile, 'utf-8'));
        return status.lastSync || new Date().toISOString();
      }
      
      // Check log file modification time as fallback
      if (existsSync(this.logFile)) {
        const stats = statSync(this.logFile);
        return stats.mtime.toISOString();
      }
      
      return new Date().toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  private async parseLogFile(): Promise<{ progress: number; errors: string[]; lastError: string }> {
    try {
      if (!existsSync(this.logFile)) {
        return { progress: 0, errors: [], lastError: '' };
      }

      const logs = readFileSync(this.logFile, 'utf-8').split('\n');
      const errors: string[] = [];
      let progress = 0;
      let lastError = '';

      for (const log of logs.reverse()) {
        if (log.includes('❌')) {
          errors.push(log);
          if (!lastError) lastError = log;
        }
        
        const progressMatch = log.match(/(\d+)% complete/);
        if (progressMatch && progress === 0) {
          progress = parseInt(progressMatch[1]);
        }
        
        if (errors.length >= 5) break; // Limit to recent errors
      }

      return { progress, errors: errors.reverse(), lastError };
    } catch (error) {
      return { progress: 0, errors: [error.message], lastError: error.message };
    }
  }

  private async getAlgoliaProgress(): Promise<number> {
    // In a real implementation, you'd track Algolia sync progress
    // For now, return a placeholder
    return 0;
  }

  async triggerRSRSync(): Promise<void> {
    return new Promise((resolve, reject) => {
      const syncProcess = spawn('node', ['scripts/complete-rsr-sync.cjs'], {
        detached: true,
        stdio: 'ignore'
      });
      
      syncProcess.unref();
      
      syncProcess.on('error', (error) => {
        reject(error);
      });
      
      // Give it a moment to start
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }

  async triggerAlgoliaSync(): Promise<void> {
    return new Promise((resolve, reject) => {
      const syncProcess = spawn('tsx', ['scripts/complete-algolia-sync.ts'], {
        detached: true,
        stdio: 'ignore'
      });
      
      syncProcess.unref();
      
      syncProcess.on('error', (error) => {
        reject(error);
      });
      
      // Give it a moment to start
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }
}

export const syncHealthMonitor = new SyncHealthMonitor();