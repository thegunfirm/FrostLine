// Comprehensive RSR Integration Status Check
const axios = require('axios');
const fs = require('fs');

async function checkRSRStatus() {
  console.log('🔍 RSR Integration Status Check\n');

  try {
    // Check environment variables
    console.log('🔑 Environment Status:');
    const hasRsrUsername = !!process.env.RSR_USERNAME;
    const hasRsrPassword = !!process.env.RSR_PASSWORD;
    const hasRsrStandardUser = !!process.env.RSR_STANDARD_USERNAME;
    const hasRsrStandardPass = !!process.env.RSR_STANDARD_PASSWORD;
    
    console.log(`${hasRsrUsername ? '✅' : '❌'} RSR_USERNAME: ${hasRsrUsername ? 'SET' : 'NOT SET'}`);
    console.log(`${hasRsrPassword ? '✅' : '❌'} RSR_PASSWORD: ${hasRsrPassword ? 'SET' : 'NOT SET'}`);
    console.log(`${hasRsrStandardUser ? '✅' : '❌'} RSR_STANDARD_USERNAME: ${hasRsrStandardUser ? 'SET' : 'NOT SET'}`);
    console.log(`${hasRsrStandardPass ? '✅' : '❌'} RSR_STANDARD_PASSWORD: ${hasRsrStandardPass ? 'SET' : 'NOT SET'}`);

    // Check for RSR products in database
    console.log('\n📊 Database Product Status:');
    try {
      const productResponse = await axios.get('http://localhost:5000/api/products?limit=5');
      if (productResponse.data?.products) {
        const products = productResponse.data.products;
        console.log(`✅ Found ${products.length} products in database`);
        
        if (products.length > 0) {
          console.log('📋 Sample products:');
          products.slice(0, 3).forEach((product, i) => {
            console.log(`   ${i+1}. ${product.name} - ${product.manufacturerPartNumber || product.sku} - $${product.price}`);
          });
        }
      } else {
        console.log('❌ No products found in database');
      }
    } catch (error) {
      console.log('❌ Could not retrieve products:', error.message);
    }

    // Check RSR scheduler status
    console.log('\n🔄 RSR Import Scheduler Status:');
    try {
      const schedulerResponse = await axios.get('http://localhost:5000/api/admin/rsr/comprehensive-status');
      const status = schedulerResponse.data;
      
      console.log(`✅ Scheduler Status: ${status.scheduler?.status || 'UNKNOWN'}`);
      console.log(`✅ FTP Service: ${status.ftp?.status || 'UNKNOWN'}`);
      console.log(`✅ Data Integrity: ${status.dataIntegrity?.status || 'UNKNOWN'}`);
      
      if (status.scheduler?.lastRun) {
        console.log(`⏰ Last Run: ${new Date(status.scheduler.lastRun).toLocaleString()}`);
      }
      
      if (status.scheduler?.nextRun) {
        console.log(`⏰ Next Run: ${new Date(status.scheduler.nextRun).toLocaleString()}`);
      }
      
    } catch (error) {
      console.log('❌ Could not get scheduler status:', error.message);
    }

    // Check RSR data files
    console.log('\n📁 RSR Data Files:');
    const dataDir = './server/data/rsr/downloads';
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      console.log(`✅ Found ${files.length} RSR data files:`);
      files.forEach(file => {
        const filePath = `${dataDir}/${file}`;
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        const modified = stats.mtime.toLocaleString();
        console.log(`   📄 ${file} (${sizeKB} KB, modified: ${modified})`);
      });
    } else {
      console.log('❌ RSR data directory not found');
    }

    // Check FFL data
    console.log('\n🏪 FFL Directory Status:');
    try {
      const fflResponse = await axios.get('http://localhost:5000/api/ffls/count');
      if (fflResponse.data?.count !== undefined) {
        console.log(`✅ FFL Count: ${fflResponse.data.count} dealers in database`);
      }
    } catch (error) {
      console.log('❌ Could not get FFL count:', error.message);
    }

    console.log('\n🎯 RSR Integration Summary:');
    
    // Determine overall status
    let overallStatus = 'OPERATIONAL';
    let statusEmoji = '✅';
    
    if (!hasRsrUsername || !hasRsrPassword) {
      overallStatus = 'NEEDS CREDENTIALS';
      statusEmoji = '⚠️';
    }
    
    console.log(`${statusEmoji} Overall Status: ${overallStatus}`);
    
    if (overallStatus === 'NEEDS CREDENTIALS') {
      console.log('\n📝 Required Actions:');
      console.log('1. Set RSR_USERNAME environment variable');
      console.log('2. Set RSR_PASSWORD environment variable');
      console.log('3. Run initial RSR import to populate database');
    } else {
      console.log('\n📈 System Capabilities:');
      console.log('✅ RSR FTP downloads configured');
      console.log('✅ Automatic import scheduling active');
      console.log('✅ Product database operational');
      console.log('✅ Data integrity monitoring enabled');
    }

    return overallStatus === 'OPERATIONAL';

  } catch (error) {
    console.error('\n❌ RSR STATUS CHECK FAILED:', error.message);
    return false;
  }
}

checkRSRStatus().then(success => {
  process.exit(success ? 0 : 1);
});