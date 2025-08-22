import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'basic-ftp';
import { rsrFileProcessor } from './rsr-file-processor';

/**
 * RSR Group FTP Client Service
 * Automated FTP downloads from RSR Group with admin panel controls
 * Part of multi-distributor architecture
 */

export interface RSRFTPConfig {
  host: string;
  username: string;
  password: string;
  port: number;
  secure: boolean;
  syncSchedule: 'manual' | 'hourly' | '2hours' | '4hours' | '6hours' | '12hours' | 'daily';
  autoProcessFiles: boolean;
  downloadImages: boolean;
  downloadHighRes: boolean;
  enabled: boolean;
}

export interface RSRSyncStatus {
  lastSync: Date | null;
  nextSync: Date | null;
  isRunning: boolean;
  filesDownloaded: number;
  filesProcessed: number;
  errors: string[];
  lastError: string | null;
  totalProducts: number;
  inventoryUpdates: number;
}

class RSRFTPClient {
  private config: RSRFTPConfig;
  private status: RSRSyncStatus;
  private syncTimer: NodeJS.Timeout | null = null;
  private downloadDirectory = join(process.cwd(), 'server', 'data', 'distributors', 'rsr', 'downloads');

  constructor() {
    // Use existing RSR credentials from environment if available
    this.config = {
      host: process.env.RSR_FTP_HOST || 'ftps.rsrgroup.com',
      username: process.env.RSR_USERNAME || '60742',
      password: process.env.RSR_PASSWORD || '',
      port: 2222,
      secure: true,
      syncSchedule: '2hours', // RSR updates every 2 hours
      autoProcessFiles: true,
      downloadImages: true,  // Enable image caching
      downloadHighRes: true, // Cache high-res images too
      enabled: true
    };

    this.status = {
      lastSync: null,
      nextSync: null,
      isRunning: false,
      filesDownloaded: 0,
      filesProcessed: 0,
      errors: [],
      lastError: null,
      totalProducts: 0,
      inventoryUpdates: 0
    };

    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dirs = [
      this.downloadDirectory,
      join(this.downloadDirectory, 'inventory'),
      join(this.downloadDirectory, 'images'),
      join(this.downloadDirectory, 'images', 'standard'),
      join(this.downloadDirectory, 'images', 'highres'),
      join(this.downloadDirectory, 'archive')
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Update RSR FTP configuration
   */
  updateConfig(newConfig: Partial<RSRFTPConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.rescheduleSync();
    console.log('RSR FTP config updated:', this.getConfigForLogging());
  }

  /**
   * Get config without sensitive data for logging
   */
  private getConfigForLogging() {
    const { password, ...safeConfig } = this.config;
    return { ...safeConfig, password: password ? '***' : '' };
  }

  /**
   * Get current configuration and status
   */
  getStatus(): { config: Omit<RSRFTPConfig, 'password'>; status: RSRSyncStatus } {
    const { password, ...configWithoutPassword } = this.config;
    return {
      config: configWithoutPassword,
      status: this.status
    };
  }

  /**
   * Test RSR FTP connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.config.host || !this.config.username || !this.config.password) {
      return {
        success: false,
        message: 'RSR FTP credentials not configured. Please set host, username, and password.'
      };
    }

    const client = new Client();
    client.ftp.verbose = false;
    
    try {
      console.log('Attempting RSR FTP connection with config:', {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        username: this.config.username
      });
      
      await client.access({
        host: this.config.host,
        user: this.config.username,
        password: this.config.password,
        port: this.config.port,
        secure: true,
        secureOptions: {
          rejectUnauthorized: false,
          requestCert: false,
          agent: false
        }
      });

      const list = await client.list();
      
      // Look for expected RSR files
      const expectedFiles = ['rsrinventory-new.txt', 'IM-QTY-CSV.csv'];
      const foundFiles = list.filter(item => 
        expectedFiles.some(expected => item.name.includes(expected.split('.')[0]))
      );

      client.close();

      return {
        success: true,
        message: `Connected to RSR FTP successfully. Found ${list.length} items.`,
        details: {
          totalItems: list.length,
          expectedFilesFound: foundFiles.length,
          foundFiles: foundFiles.map(f => f.name)
        }
      };
    } catch (error: any) {
      client.close();
      return {
        success: false,
        message: `RSR FTP connection failed: ${error.message}`,
        details: { error: error.code || error.message }
      };
    }
  }

  /**
   * Manual sync trigger for RSR
   */
  async triggerSync(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('RSR FTP sync is disabled. Enable it in configuration first.');
    }

    if (this.status.isRunning) {
      throw new Error('RSR sync already in progress');
    }

    await this.performSync();
  }

  /**
   * Schedule automatic RSR sync
   */
  private rescheduleSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.config.syncSchedule === 'manual' || !this.config.enabled) {
      this.status.nextSync = null;
      return;
    }

    const intervals = {
      'hourly': 60 * 60 * 1000,
      '2hours': 2 * 60 * 60 * 1000,      // RSR inventory updates every 2 hours
      '4hours': 4 * 60 * 60 * 1000,
      '6hours': 6 * 60 * 60 * 1000,
      '12hours': 12 * 60 * 60 * 1000,
      'daily': 24 * 60 * 60 * 1000
    };

    const interval = intervals[this.config.syncSchedule];
    if (interval) {
      this.syncTimer = setInterval(() => {
        this.performSync().catch(error => {
          console.error('Scheduled RSR sync failed:', error);
          this.status.lastError = error.message;
        });
      }, interval);

      this.status.nextSync = new Date(Date.now() + interval);
      console.log(`RSR sync scheduled every ${this.config.syncSchedule}, next at:`, this.status.nextSync);
    }
  }

  /**
   * Perform complete RSR sync operation
   */
  private async performSync(): Promise<void> {
    this.status.isRunning = true;
    this.status.filesDownloaded = 0;
    this.status.filesProcessed = 0;
    this.status.errors = [];
    this.status.lastError = null;

    console.log('Starting RSR FTP sync...');

    try {
      const client = new Client();
      client.ftp.verbose = false;
      
      await client.access({
        host: this.config.host,
        user: this.config.username,
        password: this.config.password,
        port: this.config.port,
        secure: true,
        secureOptions: {
          rejectUnauthorized: false,
          requestCert: false,
          agent: false
        }
      });

      // Download RSR inventory files
      await this.downloadRSRInventoryFiles(client);

      // Download RSR images if enabled
      if (this.config.downloadImages) {
        await this.downloadRSRImages(client, false);
      }

      if (this.config.downloadHighRes) {
        await this.downloadRSRImages(client, true);
      }

      client.close();

      // Process downloaded RSR files
      if (this.config.autoProcessFiles) {
        await this.processRSRFiles();
      }

      this.status.lastSync = new Date();
      console.log(`RSR sync completed. Downloaded: ${this.status.filesDownloaded}, Processed: ${this.status.filesProcessed}`);

    } catch (error: any) {
      this.status.lastError = error.message;
      this.status.errors.push(`RSR Sync: ${error.message}`);
      console.error('RSR sync failed:', error);
      throw error;
    } finally {
      this.status.isRunning = false;
    }
  }

  /**
   * Download RSR-specific inventory files
   */
  private async downloadRSRInventoryFiles(client: Client): Promise<void> {
    const rsrFiles = [
      'rsrinventory-new.txt',        // Main RSR inventory (77 fields)
      'IM-QTY-CSV.csv',              // RSR quantities (every 5 minutes)
      'IM-NEW-SKUS.csv',             // RSR new products
      'rsrdeletedinv.txt',           // RSR deleted products
      'attributes-all.txt',          // RSR product attributes
      'categories.txt',              // RSR categories
      'rsr-ship-restrictions.txt',   // RSR shipping restrictions
      'rsr-product-message.txt',     // RSR product messages
      'product_sell_descriptions.txt', // RSR marketing descriptions
      'product-xref.txt',            // RSR related products
      'ffl-transfer-dealers.txt'     // RSR FFL dealer network
    ];

    for (const filename of rsrFiles) {
      try {
        const localPath = join(this.downloadDirectory, 'inventory', filename);
        const writeStream = createWriteStream(localPath);
        
        await client.downloadTo(writeStream, filename);
        this.status.filesDownloaded++;
        console.log(`Downloaded RSR file: ${filename}`);
        
      } catch (error: any) {
        console.warn(`Failed to download RSR file ${filename}:`, error.message);
        this.status.errors.push(`RSR ${filename}: ${error.message}`);
      }
    }
  }

  /**
   * Download RSR product images from FTP
   */
  private async downloadRSRImages(client: Client, highRes: boolean = false): Promise<void> {
    const imageDir = highRes ? 'ftp_highres_images' : 'ftp_images';
    const localDir = join(this.downloadDirectory, 'images', highRes ? 'highres' : 'standard');

    try {
      await client.cd(imageDir);
      const imageList = await client.list();
      
      let downloadCount = 0;
      const maxDownloads = 100; // Limit for initial sync

      for (const item of imageList) {
        if (item.isFile && downloadCount < maxDownloads) {
          try {
            const localPath = join(localDir, item.name);
            
            if (existsSync(localPath)) {
              continue;
            }
            
            const writeStream = createWriteStream(localPath);
            await client.downloadTo(writeStream, item.name);
            downloadCount++;
            this.status.filesDownloaded++;
            
            if (downloadCount % 25 === 0) {
              console.log(`Downloaded ${downloadCount} RSR ${highRes ? 'high-res' : 'standard'} images...`);
            }
            
          } catch (error: any) {
            console.warn(`Failed to download RSR image ${item.name}:`, error.message);
          }
        }
      }

      console.log(`Downloaded ${downloadCount} RSR ${highRes ? 'high-res' : 'standard'} images`);

    } catch (error: any) {
      console.warn(`Failed to access RSR image directory ${imageDir}:`, error.message);
      this.status.errors.push(`RSR Images: ${error.message}`);
    }
  }

  /**
   * Process downloaded RSR files
   */
  private async processRSRFiles(): Promise<void> {
    const inventoryDir = join(this.downloadDirectory, 'inventory');

    // Process RSR main inventory file
    const inventoryFile = join(inventoryDir, 'rsrinventory-new.txt');
    if (existsSync(inventoryFile)) {
      try {
        await rsrFileProcessor.processInventoryFile(inventoryFile);
        this.status.filesProcessed++;
        console.log('Processed RSR main inventory file');
      } catch (error: any) {
        console.error('Failed to process RSR inventory file:', error);
        this.status.errors.push(`RSR Inventory: ${error.message}`);
      }
    }

    // Process RSR quantity updates
    const quantityFile = join(inventoryDir, 'IM-QTY-CSV.csv');
    if (existsSync(quantityFile)) {
      try {
        await rsrFileProcessor.processQuantityFile(quantityFile);
        this.status.filesProcessed++;
        this.status.inventoryUpdates++;
        console.log('Processed RSR quantity updates');
      } catch (error: any) {
        console.error('Failed to process RSR quantity file:', error);
        this.status.errors.push(`RSR Quantities: ${error.message}`);
      }
    }

    // Process RSR deleted products
    const deletedFile = join(inventoryDir, 'rsrdeletedinv.txt');
    if (existsSync(deletedFile)) {
      try {
        await rsrFileProcessor.processDeletedFile(deletedFile);
        this.status.filesProcessed++;
        console.log('Processed RSR deleted products');
      } catch (error: any) {
        console.error('Failed to process RSR deleted file:', error);
        this.status.errors.push(`RSR Deleted: ${error.message}`);
      }
    }
  }

  /**
   * Enable/disable RSR sync
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled) {
      this.rescheduleSync();
      console.log('RSR sync enabled');
    } else {
      this.stopSync();
      console.log('RSR sync disabled');
    }
  }

  /**
   * Stop RSR scheduled sync
   */
  stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.status.nextSync = null;
      console.log('RSR sync schedule stopped');
    }
  }

  /**
   * Start RSR scheduled sync
   */
  startSync(): void {
    if (this.config.enabled) {
      this.rescheduleSync();
    }
  }

  /**
   * Get RSR sync metrics for admin dashboard
   */
  getMetrics() {
    return {
      distributor: 'RSR Group',
      enabled: this.config.enabled,
      lastSync: this.status.lastSync,
      nextSync: this.status.nextSync,
      isRunning: this.status.isRunning,
      filesDownloaded: this.status.filesDownloaded,
      filesProcessed: this.status.filesProcessed,
      totalProducts: this.status.totalProducts,
      inventoryUpdates: this.status.inventoryUpdates,
      errorCount: this.status.errors.length,
      lastError: this.status.lastError,
      syncSchedule: this.config.syncSchedule,
      features: {
        inventorySync: true,
        quantityUpdates: true,
        imageDownload: this.config.downloadImages,
        highResImages: this.config.downloadHighRes,
        shippingRestrictions: true,
        fflNetwork: true
      }
    };
  }
}

export const rsrFTPClient = new RSRFTPClient();