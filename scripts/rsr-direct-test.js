/**
 * Direct RSR FTP Test
 * Tests RSR connection with correct credentials and various TLS approaches
 */

import { Client } from 'basic-ftp';
import fs from 'fs';
import path from 'path';

// RSR Credentials
const RSR_CONFIG = {
  host: "ftps.rsrgroup.com",
  port: 2222,
  user: "63824",
  password: "2SSinQ58",
  secure: "explicit" // Explicit FTPS
};

async function testRSRConnection() {
  const client = new Client();
  
  try {
    console.log(`🔗 Connecting to ${RSR_CONFIG.host}:${RSR_CONFIG.port}`);
    
    // Set timeout
    client.ftp.timeout = 10000;
    
    // Connect with explicit TLS
    await client.access({
      host: RSR_CONFIG.host,
      port: RSR_CONFIG.port,
      user: RSR_CONFIG.user,
      password: RSR_CONFIG.password,
      secure: true,
      secureOptions: {
        rejectUnauthorized: false // Accept self-signed certificates
      }
    });
    
    console.log("✅ Connected successfully to RSR FTP");
    
    // List files in root
    console.log("📂 Listing RSR root directory...");
    const files = await client.list();
    
    console.log(`📋 Found ${files.length} files/directories:`);
    files.forEach(file => {
      const type = file.isDirectory ? "📁" : "📄";
      console.log(`  ${type} ${file.name} (${file.size} bytes)`);
    });
    
    // Check ftpdownloads directory
    console.log("\n📂 Checking ftpdownloads directory...");
    try {
      await client.cd('ftpdownloads');
      const downloadFiles = await client.list();
      console.log(`📋 Found ${downloadFiles.length} files in ftpdownloads:`);
      downloadFiles.forEach(file => {
        const type = file.isDirectory ? "📁" : "📄";
        console.log(`  ${type} ${file.name} (${file.size} bytes)`);
      });
      await client.cd('/'); // Go back to root
    } catch (error) {
      console.log(`❌ Cannot access ftpdownloads: ${error.message}`);
    }
    
    // Download main inventory file from ftpdownloads
    const targetFile = "rsrinventory-new.txt";
    const downloadDir = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads');
    
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    const fileExists = downloadFiles && downloadFiles.some(f => f.name === targetFile);
    if (fileExists) {
      try {
        const localPath = path.join(downloadDir, targetFile);
        console.log(`⬇️ Downloading ${targetFile}...`);
        
        await client.downloadTo(localPath, targetFile);
        
        const stats = fs.statSync(localPath);
        console.log(`✅ Downloaded ${targetFile} (${stats.size} bytes)`);
        
        // Show first few lines for verification
        const content = fs.readFileSync(localPath, 'utf8');
        const lines = content.split('\n').slice(0, 3);
        console.log(`📄 Preview of ${targetFile}:`);
        lines.forEach((line, index) => {
          console.log(`  ${index + 1}: ${line.substring(0, 100)}...`);
        });
        
      } catch (downloadError) {
        console.log(`❌ Failed to download ${targetFile}: ${downloadError.message}`);
      }
    } else {
      console.log(`⚠️ File not found: ${targetFile}`);
    }
    
    await client.close();
    console.log("👋 Disconnected from RSR FTP");
    
    return true;
    
  } catch (error) {
    console.log(`❌ RSR FTP connection failed: ${error.message}`);
    
    // Try different connection approaches
    if (error.message.includes('Login incorrect')) {
      console.log("🔐 Login failed - credentials may be incorrect or account locked");
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log("🚫 Connection refused - server may be down or port blocked");
    } else if (error.message.includes('timeout')) {
      console.log("⏱️ Connection timeout - network or firewall issues");
    }
    
    await client.close();
    return false;
  }
}

// Alternative connection test with different TLS settings
async function testAlternativeConnection() {
  console.log("\n🔄 Trying alternative connection method...");
  
  const client = new Client();
  
  try {
    // More aggressive TLS settings
    await client.access({
      host: RSR_CONFIG.host,
      port: RSR_CONFIG.port,
      user: RSR_CONFIG.user,
      password: RSR_CONFIG.password,
      secure: "explicit",
      secureOptions: {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        secureProtocol: 'TLSv1_2_method'
      }
    });
    
    console.log("✅ Alternative connection successful");
    await client.close();
    return true;
    
  } catch (error) {
    console.log(`❌ Alternative connection failed: ${error.message}`);
    await client.close();
    return false;
  }
}

async function main() {
  console.log("🧪 Testing RSR FTP Connection");
  console.log(`📡 Target: ${RSR_CONFIG.host}:${RSR_CONFIG.port}`);
  console.log(`👤 User: ${RSR_CONFIG.user}`);
  console.log("🔑 Password: [PROTECTED]");
  
  const success = await testRSRConnection();
  
  if (!success) {
    await testAlternativeConnection();
  }
  
  console.log("\n🏁 Test completed");
}

main().catch(console.error);