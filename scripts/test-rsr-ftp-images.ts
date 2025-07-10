/**
 * Test RSR FTP Image Access
 * Based on the RSR Product Images PDF documentation
 */

import { Client } from 'basic-ftp';

async function testRSRFTPImages() {
  console.log('Testing RSR FTP image access...');
  
  const client = new Client();
  client.ftp.verbose = true;
  
  try {
    // Connect to RSR FTP server
    await client.access({
      host: 'ftps.rsrgroup.com',
      user: '60742',
      password: '2SSinQ58',
      port: 2222,
      secure: true,
      secureOptions: {
        rejectUnauthorized: false,
        requestCert: false,
        agent: false
      }
    });
    
    console.log('✅ Connected to RSR FTP server');
    
    // List main directories
    const rootList = await client.list('/');
    console.log('\n📁 Root directory contents:');
    rootList.forEach(item => {
      console.log(`  ${item.type === 1 ? '📁' : '📄'} ${item.name} (${item.size} bytes)`);
    });
    
    // Check for Glock images in the 'g' directory
    const imageDirs = [
      '/ftp_images/rsr_number/g',
      '/ftp_highres_images/rsr_number/g'
    ];
    
    for (const dir of imageDirs) {
      try {
        console.log(`\n🔍 Checking directory: ${dir}`);
        const dirList = await client.list(dir);
        console.log(`  Found ${dirList.length} items in ${dir}`);
        
        // Show first few items
        dirList.slice(0, 5).forEach(item => {
          console.log(`  ${item.type === 1 ? '📁' : '📄'} ${item.name} (${item.size} bytes)`);
        });
        
        // Look for Glock images specifically
        const glockImages = dirList.filter(item => 
          item.name.toLowerCase().includes('glock') && 
          item.name.toLowerCase().includes('.jpg')
        );
        
        if (glockImages.length > 0) {
          console.log(`\n🔫 Found ${glockImages.length} Glock images in ${dir}:`);
          glockImages.forEach(img => {
            console.log(`  📷 ${img.name} (${img.size} bytes)`);
          });
        }
        
      } catch (error) {
        console.log(`  ❌ Cannot access ${dir}: ${error.message}`);
      }
    }
    
    client.close();
    console.log('\n✅ RSR FTP image test completed');
    
  } catch (error) {
    console.error('❌ RSR FTP connection failed:', error.message);
    client.close();
  }
}

// Run the test
testRSRFTPImages();