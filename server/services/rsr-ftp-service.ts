/**
 * RSR FTP Download Service
 * Handles automated downloading of RSR files via FTP
 */

import { Client } from 'basic-ftp';
import fs from 'fs';
import path from 'path';

interface FTPConfig {
  host: string;
  user: string;
  password: string;
  secure: boolean;
  port: number;
  downloadPath: string;
  files: {
    inventory: string;
    quantities: string;
    attributes: string;
    deleted: string;
    restrictions: string;
  };
}

export class RSRFTPService {
  private config: FTPConfig;
  private downloadDir: string;

  constructor() {
    this.downloadDir = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads');
    this.ensureDownloadDirectory();
    
    this.config = {
      host: process.env.RSR_FTP_HOST || 'ftps.rsrgroup.com',
      user: process.env.RSR_USERNAME || '',
      password: process.env.RSR_PASSWORD || '',
      secure: true,
      port: 2222, // RSR uses port 2222 for FTPS
      downloadPath: '/ftpdownloads/',
      files: {
        inventory: 'rsrinventory-new.txt',
        quantities: 'IM-QTY-CSV.csv',
        attributes: 'attributes-all.txt',
        deleted: 'rsrdeletedinv.txt',
        restrictions: 'rsr-ship-restrictions.txt'
      }
    };
  }

  private ensureDownloadDirectory(): void {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
      console.log(`📁 Created RSR download directory: ${this.downloadDir}`);
    }
  }

  /**
   * Download all RSR files
   */
  async downloadAllFiles(): Promise<{ success: boolean; downloaded: string[]; errors: string[] }> {
    const downloaded: string[] = [];
    const errors: string[] = [];

    try {
      if (!this.config.user || !this.config.password) {
        throw new Error('RSR FTP credentials not configured. Please set RSR_USERNAME and RSR_PASSWORD environment variables.');
      }

      console.log('📥 Connecting to RSR FTP server...');
      
      const client = new Client();
      client.ftp.verbose = true; // Enable verbose logging for debugging
      
      await client.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        secure: this.config.secure
      });

      console.log('✅ Connected to RSR FTP server');

      // Download each file
      for (const [fileType, fileName] of Object.entries(this.config.files)) {
        try {
          const remotePath = `${this.config.downloadPath}${fileName}`;
          const localPath = path.join(this.downloadDir, fileName);
          
          console.log(`📥 Downloading ${fileName}...`);
          await client.downloadTo(localPath, remotePath);
          
          // Verify file was downloaded and has content
          if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
            downloaded.push(fileName);
            console.log(`✅ Downloaded ${fileName} (${this.formatFileSize(fs.statSync(localPath).size)})`);
          } else {
            errors.push(`${fileName}: Downloaded file is empty or missing`);
          }
          
        } catch (error: any) {
          errors.push(`${fileName}: ${error.message}`);
          console.error(`❌ Failed to download ${fileName}:`, error.message);
        }
      }

      client.close();
      console.log('🔐 Disconnected from RSR FTP server');

    } catch (error: any) {
      errors.push(`FTP Connection: ${error.message}`);
      console.error('❌ RSR FTP download failed:', error);
    }

    return {
      success: downloaded.length > 0,
      downloaded,
      errors
    };
  }

  /**
   * Download specific file
   */
  async downloadFile(fileType: keyof FTPConfig['files']): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config.user || !this.config.password) {
        throw new Error('RSR FTP credentials not configured');
      }

      const fileName = this.config.files[fileType];
      if (!fileName) {
        throw new Error(`Unknown file type: ${fileType}`);
      }

      console.log(`📥 Downloading ${fileName}...`);

      const client = new Client();
      client.ftp.verbose = true; // Enable verbose logging
      
      await client.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        secure: this.config.secure
      });

      const remotePath = `${this.config.downloadPath}${fileName}`;
      const localPath = path.join(this.downloadDir, fileName);
      
      await client.downloadTo(localPath, remotePath);
      client.close();

      if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
        console.log(`✅ Downloaded ${fileName} (${this.formatFileSize(fs.statSync(localPath).size)})`);
        return { success: true };
      } else {
        throw new Error('Downloaded file is empty or missing');
      }

    } catch (error: any) {
      console.error(`❌ Failed to download ${fileType}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if file exists locally and get info
   */
  getFileInfo(fileType: keyof FTPConfig['files']): { exists: boolean; size?: number; modified?: Date } | null {
    try {
      const fileName = this.config.files[fileType];
      if (!fileName) return null;

      const localPath = path.join(this.downloadDir, fileName);
      
      if (fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        return {
          exists: true,
          size: stats.size,
          modified: stats.mtime
        };
      }

      return { exists: false };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all file statuses
   */
  getAllFileStatuses(): Record<keyof FTPConfig['files'], { exists: boolean; size?: number; modified?: Date } | null> {
    const statuses = {} as Record<keyof FTPConfig['files'], { exists: boolean; size?: number; modified?: Date } | null>;
    
    for (const fileType of Object.keys(this.config.files) as Array<keyof FTPConfig['files']>) {
      statuses[fileType] = this.getFileInfo(fileType);
    }
    
    return statuses;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Test FTP connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config.user || !this.config.password) {
        throw new Error('RSR FTP credentials not configured');
      }

      console.log('🔍 Testing RSR FTP connection...');
      
      const client = new Client();
      await client.access({
        host: this.config.host,
        user: this.config.user,
        password: this.config.password,
        secure: this.config.secure
      });

      console.log('✅ RSR FTP connection successful');
      client.close();
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ RSR FTP connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export const rsrFTPService = new RSRFTPService();