#!/usr/bin/env node

/**
 * ATF FFL Directory Download and Processing Script
 * Downloads the official ATF FFL directory and processes it for cross-referencing with RSR data
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create data directory structure
const dataDir = path.join(__dirname, '..', 'server', 'data', 'atf');
const downloadsDir = path.join(dataDir, 'downloads');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

console.log('🇺🇸 Starting ATF FFL Directory Download...');

// Download the official ATF FFL Excel file
const downloadAtfDirectory = async () => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(downloadsDir, 'atf-ffl-list.xls');
    const file = fs.createWriteStream(filePath);
    
    console.log('📥 Downloading ATF FFL directory (19+ MB)...');
    
    const request = https.get('https://www.atf.gov/resource-center/docs/ffl-listxls/download', (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log('✅ ATF FFL directory downloaded successfully');
          console.log(`📁 File saved to: ${filePath}`);
          resolve(filePath);
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        const redirectUrl = response.headers.location;
        console.log(`🔄 Redirecting to: ${redirectUrl}`);
        https.get(redirectUrl, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log('✅ ATF FFL directory downloaded successfully');
            resolve(filePath);
          });
        });
      } else {
        reject(new Error(`Failed to download ATF directory: ${response.statusCode}`));
      }
    });

    request.on('error', (err) => {
      fs.unlink(filePath, () => {}); // Clean up file on error
      reject(err);
    });
  });
};

// Create ATF processing status file
const createStatusFile = () => {
  const statusFile = path.join(dataDir, 'atf-sync-status.json');
  const status = {
    lastDownload: new Date().toISOString(),
    fileSize: 0,
    totalRecords: 0,
    processedRecords: 0,
    status: 'downloaded',
    notes: 'ATF FFL directory downloaded for cross-referencing with RSR data'
  };
  
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  console.log('📊 Status file created');
};

// Main execution
const main = async () => {
  try {
    const filePath = await downloadAtfDirectory();
    
    // Get file size
    const stats = fs.statSync(filePath);
    console.log(`📏 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    createStatusFile();
    
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Install Excel processing library: npm install xlsx');
    console.log('   2. Create ATF parsing script to extract FFL data');
    console.log('   3. Cross-reference with RSR data to set status flags');
    console.log('   4. Update database with combined ATF + RSR FFL directory');
    console.log('');
    console.log('📋 ATF Data Structure:');
    console.log('   - License Number');
    console.log('   - License Name'); 
    console.log('   - Trade Name');
    console.log('   - License Type (01, 07, etc.)');
    console.log('   - Premises Address');
    console.log('   - Mailing Address');
    console.log('   - Expiration Date');
    
  } catch (error) {
    console.error('❌ Error downloading ATF directory:', error.message);
    process.exit(1);
  }
};

main();