/**
 * Test RSR FTP Connection
 * Verifies credentials and connection to RSR FTP server
 */

import { Client } from 'basic-ftp';

async function testRSRFTPConnection() {
  const client = new Client();
  
  try {
    console.log('🔍 Testing RSR FTP connection...');
    
    // Test with current credentials
    await client.access({
      host: process.env.RSR_FTP_HOST || 'ftps.rsrgroup.com',
      user: process.env.RSR_USERNAME || '63824',
      password: process.env.RSR_PASSWORD || 'RunTheGunZ623!',
      port: 2222,
      secure: true
    });
    
    console.log('✅ RSR FTP connection successful!');
    
    // Test directory listing
    const files = await client.list('/');
    console.log(`📁 Root directory has ${files.length} items`);
    
    // Test image directory access
    try {
      const imageFiles = await client.list('/ftp_images/');
      console.log(`📸 Image directory has ${imageFiles.length} items`);
      
      // Test specific image directory
      const gFiles = await client.list('/ftp_images/rsr_number/g/');
      console.log(`📸 'g' directory has ${gFiles.length} image files`);
      
      // Test downloading a specific image
      const testSKU = 'GLSP00427';
      const imagePath = `/ftp_images/rsr_number/g/${testSKU}_1.jpg`;
      
      try {
        const buffer = await client.downloadTo(Buffer.alloc(0), imagePath);
        console.log(`✅ Successfully downloaded ${testSKU}: ${buffer.length} bytes`);
      } catch (dlError) {
        console.log(`❌ Failed to download ${testSKU}: ${dlError.message}`);
      }
      
    } catch (err) {
      console.log(`❌ Image directory access failed: ${err.message}`);
    }
    
    await client.close();
    console.log('🔌 Connection closed successfully');
    
  } catch (error) {
    console.error('❌ RSR FTP connection failed:', error.message);
    
    // Try alternative credentials if available
    if (process.env.RSR_STANDARD_USERNAME && process.env.RSR_STANDARD_PASSWORD) {
      console.log('🔄 Trying alternative credentials...');
      
      try {
        await client.access({
          host: process.env.RSR_FTP_HOST || 'ftps.rsrgroup.com',
          user: process.env.RSR_STANDARD_USERNAME,
          password: process.env.RSR_STANDARD_PASSWORD,
          port: 2222,
          secure: true
        });
        
        console.log('✅ Alternative credentials successful!');
        await client.close();
      } catch (altError) {
        console.error('❌ Alternative credentials also failed:', altError.message);
      }
    }
  }
}

testRSRFTPConnection().catch(console.error);