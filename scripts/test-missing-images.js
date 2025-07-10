/**
 * Test Missing RSR Images
 * Direct test of the specific missing images reported
 */

import { Client } from 'basic-ftp';

async function testMissingImages() {
  const client = new Client();
  
  const missingImages = [
    'GLUX4350204FRNANIMGSCT',
    'GLUX4350204FRNOUTYSCT', 
    'GLUX4350204FRNOUTBSCT',
    'GLUX4350204FRNTORN-SCT'
  ];
  
  try {
    await client.access({
      host: 'ftps.rsrgroup.com',
      user: '60742',
      password: '2SSinQ58',
      port: 2222,
      secure: true
    });
    
    console.log('✅ RSR FTP connection successful');
    
    for (const sku of missingImages) {
      console.log(`\n🔍 Testing image: ${sku}`);
      
      // Test multiple patterns
      const patterns = [
        `/ftp_images/rsr_number/g/${sku}_1.jpg`,
        `/ftp_images/rsr_number/g/${sku}.jpg`,
        `/ftp_images/rsr_number/g/${sku}_2.jpg`,
        `/ftp_images/rsr_number/g/${sku}_3.jpg`,
        `/ftp_highres_images/rsr_number/g/${sku}_1_HR.jpg`
      ];
      
      let found = false;
      for (const pattern of patterns) {
        try {
          // Use a simple existence check instead of full download
          const stream = await client.downloadTo(require('stream').Writable(), pattern);
          console.log(`  ✅ FOUND: ${pattern}`);
          found = true;
        } catch (err) {
          if (err.message.includes('No such file') || err.message.includes('550')) {
            console.log(`  ❌ Missing: ${pattern} - File does not exist`);
          } else {
            console.log(`  ❌ Missing: ${pattern} - ${err.message}`);
          }
        }
      }
      
      if (!found) {
        // Check if the SKU exists in directory listing
        try {
          const files = await client.list('/ftp_images/rsr_number/g/');
          const matchingFiles = files.filter(f => f.name.includes(sku));
          if (matchingFiles.length > 0) {
            console.log(`  📁 Found ${matchingFiles.length} files containing '${sku}':`);
            matchingFiles.forEach(f => console.log(`    - ${f.name} (${f.size} bytes)`));
          } else {
            console.log(`  ❌ No files found containing '${sku}' in directory`);
          }
        } catch (listErr) {
          console.log(`  ❌ Directory listing failed: ${listErr.message}`);
        }
      }
    }
    
    await client.close();
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ RSR FTP connection failed:', error.message);
  }
}

testMissingImages().catch(console.error);