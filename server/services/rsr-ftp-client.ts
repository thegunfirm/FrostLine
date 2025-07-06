import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'basic-ftp';
import { rsrFileProcessor } from './rsr-file-processor';

/**
 * RSR FTP Client Service
 * Automated FTP downloads from RSR Group with admin panel controls
 * Handles scheduled sync and file processing
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
}

export interface RSRSyncStatus {
  lastSync: Date | null;
  nextSync: Date | null;
  isRunning: boolean;
  filesDownloaded: number;
  filesProcessed: number;
  errors: string[];
  lastError: string | null;
}

class RSRFTPClient {
  private config: RSRFTPConfig;
  private status: RSRSyncStatus;
  private syncTimer: NodeJS.Timeout | null = null;
  private downloadDirectory = join(process.cwd(), 'server', 'data', 'rsr-downloads');

  constructor() {
    this.config = {
      host: '',
      username: '',
      password: '',
      port: 21,
      secure: false,
      syncSchedule: 'manual',
      autoProcessFiles: true,
      downloadImages: false,
      downloadHighRes: false
    };

    this.status = {
      lastSync: null,
      nextSync: null,
      isRunning: false,
      filesDownloaded: 0,
      filesProcessed: 0,
      errors: [],
      lastError: null
    };

    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dirs = [
      this.downloadDirectory,
      join(this.downloadDirectory, 'inventory'),
      join(this.downloadDirectory, 'images'),
      join(this.downloadDirectory, 'images', 'standard'),
      join(this.downloadDirectory, 'images', 'highres')
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Update FTP configuration
   */
  updateConfig(newConfig: Partial<RSRFTPConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.rescheduleSync();
    console.log('RSR FTP config updated:', this.config);
  }

  /**
   * Get current configuration and status
   */
  getStatus(): { config: RSRFTPConfig; status: RSRSyncStatus } {
    return {
      config: this.config,
      status: this.status
    };
  }

  /**
   * Test FTP connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config.host || !this.config.username || !this.config.password) {
      return {
        success: false,
        message: 'FTP credentials not configured. Please set host, username, and password.'
      };
    }

    const client = new Client();
    
    try {
      await client.access({
        host: this.config.host,
        user: this.config.username,
        password: this.config.password,
        port: this.config.port,
        secure: this.config.secure
      });

      const list = await client.list();
      client.close();

      return {
        success: true,
        message: `Connected successfully. Found ${list.length} items in root directory.`
      };
    } catch (error: any) {
      client.close();
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  /**
   * Manual sync trigger
   */
  async triggerSync(): Promise<void> {
    if (this.status.isRunning) {
      throw new Error('Sync already in progress');
    }

    await this.performSync();
  }

  /**
   * Schedule automatic sync based on configuration
   */
  private rescheduleSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.config.syncSchedule === 'manual') {
      this.status.nextSync = null;
      return;
    }

    const intervals = {
      'hourly': 60 * 60 * 1000,
      '2hours': 2 * 60 * 60 * 1000,
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
   * Perform complete RSR sync
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
      
      await client.access({
        host: this.config.host,
        user: this.config.username,
        password: this.config.password,
        port: this.config.port,
        secure: this.config.secure
      });

      // Download inventory files
      await this.downloadInventoryFiles(client);

      // Download images if enabled
      if (this.config.downloadImages) {
        await this.downloadImages(client, false);
      }

      if (this.config.downloadHighRes) {
        await this.downloadImages(client, true);
      }

      client.close();

      // Process downloaded files if auto-processing enabled
      if (this.config.autoProcessFiles) {
        await this.processDownloadedFiles();
      }

      this.status.lastSync = new Date();
      console.log(`RSR sync completed. Downloaded: ${this.status.filesDownloaded}, Processed: ${this.status.filesProcessed}`);

    } catch (error: any) {
      this.status.lastError = error.message;
      this.status.errors.push(error.message);
      console.error('RSR sync failed:', error);
      throw error;
    } finally {
      this.status.isRunning = false;
    }
  }

  /**
   * Download RSR inventory files
   */
  private async downloadInventoryFiles(client: Client): Promise<void> {
    const files = [
      'rsrinventory-new.txt',        // Main inventory (77 fields)
      'IM-QTY-CSV.csv',              // Quantities (every 5 minutes)
      'IM-NEW-SKUS.csv',             // New products
      'rsrdeletedinv.txt',           // Deleted products
      'attributes-all.txt',          // Product attributes
      'categories.txt',              // Categories
      'rsr-ship-restrictions.txt',   // Shipping restrictions
      'rsr-product-message.txt',     // Product messages
      'product_sell_descriptions.txt', // Descriptions
      'product-xref.txt',            // Related products
      'ffl-transfer-dealers.txt'     // FFL dealers
    ];

    for (const filename of files) {
      try {
        const localPath = join(this.downloadDirectory, 'inventory', filename);
        const writeStream = createWriteStream(localPath);
        
        await client.downloadTo(writeStream, filename);
        this.status.filesDownloaded++;
        console.log(`Downloaded: ${filename}`);
        
      } catch (error: any) {
        console.warn(`Failed to download ${filename}:`, error.message);
        this.status.errors.push(`${filename}: ${error.message}`);
      }
    }
  }

  /**
   * Download RSR product images
   */
  private async downloadImages(client: Client, highRes: boolean = false): Promise<void> {
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
            const writeStream = createWriteStream(localPath);
            
            await client.downloadTo(writeStream, item.name);
            downloadCount++;
            this.status.filesDownloaded++;
            
            if (downloadCount % 10 === 0) {
              console.log(`Downloaded ${downloadCount} ${highRes ? 'high-res' : 'standard'} images...`);
            }
            
          } catch (error: any) {
            console.warn(`Failed to download image ${item.name}:`, error.message);
          }
        }
      }

      console.log(`Downloaded ${downloadCount} ${highRes ? 'high-res' : 'standard'} images`);

    } catch (error: any) {
      console.warn(`Failed to access image directory ${imageDir}:`, error.message);
      this.status.errors.push(`Images: ${error.message}`);
    }
  }

  /**
   * Process downloaded files using RSR file processor
   */
  private async processDownloadedFiles(): Promise<void> {
    const inventoryDir = join(this.downloadDirectory, 'inventory');

    // Process main inventory file
    const inventoryFile = join(inventoryDir, 'rsrinventory-new.txt');
    if (existsSync(inventoryFile)) {
      try {
        await rsrFileProcessor.processInventoryFile(inventoryFile);
        this.status.filesProcessed++;
        console.log('Processed main inventory file');
      } catch (error: any) {
        console.error('Failed to process inventory file:', error);
        this.status.errors.push(`Inventory processing: ${error.message}`);
      }
    }

    // Process quantity updates
    const quantityFile = join(inventoryDir, 'IM-QTY-CSV.csv');
    if (existsSync(quantityFile)) {
      try {
        await rsrFileProcessor.processQuantityFile(quantityFile);
        this.status.filesProcessed++;
        console.log('Processed quantity updates');
      } catch (error: any) {
        console.error('Failed to process quantity file:', error);
        this.status.errors.push(`Quantity processing: ${error.message}`);
      }
    }

    // Process deleted products
    const deletedFile = join(inventoryDir, 'rsrdeletedinv.txt');
    if (existsSync(deletedFile)) {
      try {
        await rsrFileProcessor.processDeletedFile(deletedFile);
        this.status.filesProcessed++;
        console.log('Processed deleted products');
      } catch (error: any) {
        console.error('Failed to process deleted file:', error);
        this.status.errors.push(`Deleted processing: ${error.message}`);
      }
    }
  }

  /**
   * Stop scheduled sync
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
   * Start scheduled sync
   */
  startSync(): void {
    this.rescheduleSync();
  }
}

export const rsrFTPClient = new RSRFTPClient();