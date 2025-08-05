#!/usr/bin/env tsx

/**
 * Download authentic FFL data from RSR distributor
 * This script uses the existing RSR FTP client to download real FFL dealer data
 */

import { rsrFTPClient } from '../server/services/distributors/rsr/rsr-ftp-client';
import { rsrFFLImportService } from '../server/services/rsr-ffl-import';

async function downloadAndImportFFLData() {
  try {
    console.log('🔗 Testing RSR FTP connection...');
    
    const connectionTest = await rsrFTPClient.testConnection();
    console.log('Connection result:', connectionTest);
    
    if (!connectionTest.success) {
      console.error('❌ RSR FTP connection failed:', connectionTest.message);
      return;
    }
    
    console.log('✅ RSR FTP connection successful');
    console.log('📥 Downloading latest inventory and FFL data...');
    
    await rsrFTPClient.triggerSync();
    
    console.log('✅ RSR data download completed');
    console.log('📋 Importing FFL dealer data...');
    
    const importResult = await rsrFFLImportService.importFFLs();
    console.log('Import result:', importResult);
    
    if (importResult.imported > 0 || importResult.updated > 0) {
      console.log(`✅ Successfully imported ${importResult.imported} new FFLs and updated ${importResult.updated} existing FFLs`);
    } else {
      console.log('⚠️ No FFL data found in RSR files - may need to check file format or location');
    }
    
  } catch (error) {
    console.error('❌ Error downloading/importing FFL data:', error);
  }
}

// Run the script
downloadAndImportFFLData();