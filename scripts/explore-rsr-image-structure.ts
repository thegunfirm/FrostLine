/**
 * Explore RSR Image Structure
 * Investigates RSR's complete image naming patterns and angle variations
 */

import { Client } from 'basic-ftp';

async function exploreRSRImageStructure() {
  const client = new Client();
  
  try {
    await client.access({
      host: process.env.RSR_FTP_HOST || 'ftps.rsrgroup.com',
      user: process.env.RSR_USERNAME || '60742',
      password: process.env.RSR_PASSWORD || '2SSinQ58',
      port: 2222,
      secure: true
    });
    console.log('🔍 Exploring RSR image structure for comprehensive understanding...');
    
    // Test multiple known Glock products
    const testProducts = [
      'GLUX4350204FRNRGSKY',  // Known working product
      'GLUX4350204FRNANIMGSCT', // Known missing product
      'GLSP00427',             // Previously tested product
      'GLSP00490',             // Previously tested product
      'GLSP00497'              // Previously tested product
    ];
    
    for (const sku of testProducts) {
      console.log(`\n📦 Testing product: ${sku}`);
      
      // Check all possible angles (1-7)
      const foundAngles = [];
      for (let angle = 1; angle <= 7; angle++) {
        const imagePath = `/ftp_images/rsr_number/g/${sku}_${angle}.jpg`;
        try {
          const buffer = await client.downloadTo(Buffer.alloc(0), imagePath);
          foundAngles.push(angle);
          console.log(`✅ Angle ${angle}: ${imagePath} (${buffer.length} bytes)`);
        } catch (err) {
          console.log(`❌ Angle ${angle}: ${imagePath} - ${err.message}`);
        }
      }
      
      // Check base image (no angle suffix)
      try {
        const basePath = `/ftp_images/rsr_number/g/${sku}.jpg`;
        const buffer = await client.downloadTo(Buffer.alloc(0), basePath);
        console.log(`✅ Base image: ${basePath} (${buffer.length} bytes)`);
      } catch (err) {
        console.log(`❌ Base image: ${basePath} - ${err.message}`);
      }
      
      console.log(`📊 Found ${foundAngles.length} angles for ${sku}: [${foundAngles.join(', ')}]`);
    }
    
    // Check directory structure to understand organization
    console.log('\n📁 Exploring directory structure...');
    try {
      const files = await client.listFiles('/ftp_images/rsr_number/g/');
      const glockFiles = files.filter(f => f.name.startsWith('GL')).slice(0, 20);
      
      console.log(`📊 Found ${files.length} total files in 'g' directory`);
      console.log('🔍 Sample Glock files:');
      glockFiles.forEach(file => {
        console.log(`  - ${file.name} (${file.size} bytes)`);
      });
      
      // Analyze naming patterns
      const patterns = {
        withAngle: glockFiles.filter(f => /_\d\.jpg$/.test(f.name)),
        withoutAngle: glockFiles.filter(f => /\.jpg$/.test(f.name) && !/_\d\.jpg$/.test(f.name))
      };
      
      console.log(`📊 Files with angle suffix: ${patterns.withAngle.length}`);
      console.log(`📊 Files without angle suffix: ${patterns.withoutAngle.length}`);
      
    } catch (err) {
      console.log(`❌ Directory listing error: ${err.message}`);
    }
    
    await client.disconnect();
    console.log('\n✅ RSR image structure exploration complete');
    
  } catch (error) {
    console.error('❌ Error exploring RSR image structure:', error.message);
  }
}

exploreRSRImageStructure().catch(console.error);