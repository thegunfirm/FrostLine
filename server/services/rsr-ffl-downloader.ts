import { Client } from 'basic-ftp';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * RSR FFL Data Downloader
 * Downloads authentic FFL dealer data from RSR's FTP server
 */

export class RSRFFLDownloader {
  private ftpConfig = {
    host: 'ftps.rsrgroup.com',
    port: 2222,
    username: process.env.RSR_USERNAME || '',
    password: process.env.RSR_PASSWORD || '',
    secure: true
  };

  private downloadDir = join(process.cwd(), 'server', 'data', 'distributors', 'rsr', 'downloads', 'inventory');

  constructor() {
    this.ensureDownloadDirectory();
  }

  private ensureDownloadDirectory() {
    if (!existsSync(this.downloadDir)) {
      mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  /**
   * Download FFL dealer data from RSR FTP server
   */
  async downloadFFLData(): Promise<{ success: boolean; message: string; filePath?: string }> {
    const client = new Client();
    
    try {
      console.log('🔗 Connecting to RSR FTP server...');
      
      await client.access({
        host: this.ftpConfig.host,
        user: this.ftpConfig.username,
        password: this.ftpConfig.password,
        port: this.ftpConfig.port,
        secure: this.ftpConfig.secure
      });

      console.log('✅ Connected to RSR FTP server');
      
      // List available files to find FFL data
      const files = await client.list();
      console.log('📂 Available files:', files.map(f => f.name));
      
      // Look for FFL-related files
      const fflFiles = files.filter(file => 
        file.name.toLowerCase().includes('ffl') ||
        file.name.toLowerCase().includes('dealer') ||
        file.name.toLowerCase().includes('transfer')
      );

      if (fflFiles.length === 0) {
        console.log('⚠️ No FFL files found in root directory, checking subdirectories...');
        
        // Try to navigate to common RSR directories
        const commonDirs = ['inventory', 'dealers', 'ffl', 'data'];
        
        for (const dir of commonDirs) {
          try {
            await client.cd(dir);
            const subFiles = await client.list();
            const subFflFiles = subFiles.filter(file => 
              file.name.toLowerCase().includes('ffl') ||
              file.name.toLowerCase().includes('dealer') ||
              file.name.toLowerCase().includes('transfer')
            );
            
            if (subFflFiles.length > 0) {
              console.log(`📁 Found FFL files in ${dir}:`, subFflFiles.map(f => f.name));
              fflFiles.push(...subFflFiles);
              break;
            }
            
            await client.cd('/'); // Go back to root
          } catch (error) {
            console.log(`📁 Directory ${dir} not accessible`);
            await client.cd('/'); // Ensure we're back at root
          }
        }
      }

      if (fflFiles.length === 0) {
        client.close();
        return {
          success: false,
          message: 'No FFL dealer files found on RSR FTP server. Files may be in a different location or named differently.'
        };
      }

      // Download the first FFL file found
      const fflFile = fflFiles[0];
      const localFilePath = join(this.downloadDir, 'ffl-transfer-dealers.txt');
      
      console.log(`⬇️ Downloading ${fflFile.name} to ${localFilePath}...`);
      
      const writeStream = createWriteStream(localFilePath);
      await client.downloadTo(writeStream, fflFile.name);
      
      client.close();
      
      console.log('✅ FFL data downloaded successfully');
      
      return {
        success: true,
        message: `Successfully downloaded FFL data from ${fflFile.name}`,
        filePath: localFilePath
      };

    } catch (error: any) {
      client.close();
      console.error('❌ RSR FTP download error:', error);
      
      return {
        success: false,
        message: `Failed to download FFL data: ${error.message}`
      };
    }
  }

  /**
   * Test FTP connection to RSR server
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const client = new Client();
    
    try {
      await client.access({
        host: this.ftpConfig.host,
        user: this.ftpConfig.username,
        password: this.ftpConfig.password,
        port: this.ftpConfig.port,
        secure: this.ftpConfig.secure
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
}

export const rsrFFLDownloader = new RSRFFLDownloader();