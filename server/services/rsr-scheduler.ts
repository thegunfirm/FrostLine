/**
 * RSR Sync Scheduler
 * Runs incremental sync every 2 hours as recommended by RSR
 */

import { RSRIncrementalSync } from './rsr-incremental-sync';
import { db } from '../db';
import { inventorySyncLogs } from '@shared/schema';

export class RSRScheduler {
  private syncService: RSRIncrementalSync;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.syncService = new RSRIncrementalSync();
  }

  /**
   * Start the 2-hour sync schedule
   */
  start(): void {
    if (this.intervalId) {
      console.log('⚠️ RSR scheduler already running');
      return;
    }

    console.log('🚀 Starting RSR 2-hour sync scheduler...');
    
    // Run immediately on startup
    this.runSync();
    
    // Schedule every 2 hours (2 * 60 * 60 * 1000 = 7,200,000 ms)
    this.intervalId = setInterval(() => {
      this.runSync();
    }, 2 * 60 * 60 * 1000);

    console.log('✅ RSR scheduler started - syncing every 2 hours');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ RSR scheduler stopped');
    }
  }

  /**
   * Run sync with error handling and logging
   */
  private async runSync(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ RSR sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      console.log(`🔄 RSR sync starting at ${startTime.toISOString()}`);
      
      const results = await this.syncService.performIncrementalSync();
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      // Log successful sync
      await this.logSyncResult({
        status: 'success',
        startTime,
        endTime,
        duration,
        results
      });

      console.log(`✅ RSR sync completed successfully in ${duration}ms`);
      console.log(`📊 Updated: ${results.itemsUpdated}, Added: ${results.itemsAdded}, Deleted: ${results.itemsDeleted}`);
      
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      // Log failed sync
      await this.logSyncResult({
        status: 'failed',
        startTime,
        endTime,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      console.error('❌ RSR sync failed:', error);
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Log sync results to database
   */
  private async logSyncResult(logData: {
    status: 'success' | 'failed';
    startTime: Date;
    endTime: Date;
    duration: number;
    results?: any;
    error?: string;
  }): Promise<void> {
    try {
      await db.insert(inventorySyncLogs).values({
        distributor: 'RSR',
        syncType: 'incremental',
        status: logData.status,
        startTime: logData.startTime,
        endTime: logData.endTime,
        duration: logData.duration,
        itemsProcessed: logData.results?.totalProcessed || 0,
        itemsUpdated: logData.results?.itemsUpdated || 0,
        itemsAdded: logData.results?.itemsAdded || 0,
        itemsDeleted: logData.results?.itemsDeleted || 0,
        errorMessage: logData.error || null,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Failed to log sync result:', error);
    }
  }

  /**
   * Get sync status
   */
  getStatus(): {
    isScheduled: boolean;
    isRunning: boolean;
    nextSync: Date | null;
  } {
    return {
      isScheduled: this.intervalId !== null,
      isRunning: this.isRunning,
      nextSync: this.intervalId ? new Date(Date.now() + 2 * 60 * 60 * 1000) : null
    };
  }

  /**
   * Run sync manually (for testing/admin)
   */
  async runManualSync(): Promise<any> {
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }
    
    return await this.syncService.performIncrementalSync();
  }
}

// Export singleton instance
export const rsrScheduler = new RSRScheduler();