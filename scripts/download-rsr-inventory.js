/**
 * Download Authentic RSR Inventory File
 * Downloads the real RSR inventory file from FTP server
 */

import { Client } from 'basic-ftp';
import fs from 'fs';
import path from 'path';

const RSR_CONFIG = {
  host: "ftps.rsrgroup.com",
  port: 2222,
  user: "63824",
  password: "2SSinQ58"
};

async function downloadRSRInventory() {
  const client = new Client();
  client.ftp.timeout = 30000;
  
  try {
    console.log("🔗 Connecting to RSR FTP server...");
    
    await client.access({
      host: RSR_CONFIG.host,
      port: RSR_CONFIG.port,
      user: RSR_CONFIG.user,
      password: RSR_CONFIG.password,
      secure: true,
      secureOptions: {
        rejectUnauthorized: false
      }
    });
    
    console.log("✅ Connected to RSR FTP");
    
    // Navigate to ftpdownloads directory
    await client.cd('ftpdownloads');
    
    // Download main inventory file
    const downloadDir = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    const filename = 'rsrinventory-new.txt';
    const localPath = path.join(downloadDir, filename);
    
    console.log(`⬇️ Downloading ${filename}...`);
    
    await client.downloadTo(localPath, filename);
    
    const stats = fs.statSync(localPath);
    console.log(`✅ Downloaded ${filename} (${stats.size} bytes)`);
    
    // Verify file content
    const content = fs.readFileSync(localPath, 'utf8');
    const lines = content.split('\n');
    
    console.log(`📊 File contains ${lines.length} lines`);
    console.log(`📄 First line preview: ${lines[0]?.substring(0, 100)}...`);
    
    await client.close();
    console.log("👋 Disconnected from RSR FTP");
    
    return {
      success: true,
      filePath: localPath,
      fileSize: stats.size,
      lineCount: lines.length
    };
    
  } catch (error) {
    console.error(`❌ Download failed: ${error.message}`);
    await client.close();
    return { success: false, error: error.message };
  }
}

// Execute download
downloadRSRInventory().then(result => {
  if (result.success) {
    console.log("🎉 RSR inventory file downloaded successfully!");
    console.log(`📂 File location: ${result.filePath}`);
    console.log(`📊 File size: ${result.fileSize} bytes`);
    console.log(`📄 Total lines: ${result.lineCount}`);
  } else {
    console.log("❌ Failed to download RSR inventory file");
  }
}).catch(console.error);