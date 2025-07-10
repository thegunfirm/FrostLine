/**
 * Check RSR Images - Simple verification of specific missing images
 */

import { Client } from 'basic-ftp';

async function checkRSRImages() {
  const client = new Client();
  
  try {
    await client.access({
      host: 'ftps.rsrgroup.com',
      user: '60742',
      password: '2SSinQ58',
      port: 2222,
      secure: true
    });
    
    console.log('✅ Connected to RSR FTP');
    
    // Get directory listing and check for specific images
    const files = await client.list('/ftp_images/rsr_number/g/');
    console.log(`📁 Found ${files.length} total files in g/ directory`);
    
    const missingImages = [
      'GLUX4350204FRNANIMGSCT',
      'GLUX4350204FRNOUTYSCT', 
      'GLUX4350204FRNOUTBSCT',
      'GLUX4350204FRNTORN-SCT'
    ];
    
    console.log('\n🔍 Checking for specific missing images:');
    
    for (const sku of missingImages) {
      const matchingFiles = files.filter(f => f.name.includes(sku));
      
      if (matchingFiles.length > 0) {
        console.log(`✅ ${sku}: Found ${matchingFiles.length} files`);
        matchingFiles.forEach(f => console.log(`   - ${f.name} (${f.size} bytes)`));
      } else {
        console.log(`❌ ${sku}: No files found`);
        
        // Check for similar SKUs to see if it's a naming issue
        const similarSKUs = files.filter(f => {
          const baseSKU = sku.substring(0, 15); // Get first 15 chars
          return f.name.includes(baseSKU);
        });
        
        if (similarSKUs.length > 0) {
          console.log(`   📝 Found ${similarSKUs.length} similar SKUs:`);
          similarSKUs.slice(0, 5).forEach(f => console.log(`      - ${f.name}`));
        }
      }
    }
    
    // Also check a few working images for comparison
    console.log('\n🔍 Checking some working images for comparison:');
    const workingImages = ['GLSP00427', 'GLSP00490', 'GLSP00497'];
    
    for (const sku of workingImages) {
      const matchingFiles = files.filter(f => f.name.includes(sku));
      if (matchingFiles.length > 0) {
        console.log(`✅ ${sku}: Found ${matchingFiles.length} files`);
      } else {
        console.log(`❌ ${sku}: No files found`);
      }
    }
    
    await client.close();
    console.log('\n✅ Image check completed');
    
  } catch (error) {
    console.error('❌ RSR FTP connection failed:', error.message);
  }
}

checkRSRImages().catch(console.error);