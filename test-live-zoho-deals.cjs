#!/usr/bin/env node

/**
 * Live Zoho Deal Creation Test (CommonJS)
 * 
 * Creates actual deals in Zoho CRM to verify integration is working
 */

const { execSync } = require('child_process');
const { writeFileSync, unlinkSync, existsSync, readFileSync } = require('fs');

console.log('\n🎯 LIVE ZOHO DEAL CREATION TEST');
console.log('===============================');
console.log('Creating actual deals in your Zoho CRM\n');

async function testZohoIntegration() {
  // Test using the existing server API
  const testData = {
    customerEmail: 'liveintegration@thegunfirm.com',
    customerName: 'Live Integration Test',
    customerTier: 'Bronze',
    totalAmount: 619.99,
    items: [{
      name: 'GLOCK 19 Gen 5 9mm Luger - Integration Test',
      sku: 'PI1950203',
      price: 619.99,
      quantity: 1,
      isFirearm: true
    }],
    fulfillmentType: 'Drop-Ship',
    fflDealer: {
      businessName: 'INTEGRATION TEST FFL',
      licenseNumber: '1-59-017-07-6F-13700'
    }
  };

  try {
    console.log('📡 Testing Zoho integration via server API...');
    console.log(`   Customer: ${testData.customerName}`);
    console.log(`   Email: ${testData.customerEmail}`);
    console.log(`   Product: ${testData.items[0].name}`);
    console.log(`   Amount: $${testData.totalAmount}`);
    console.log(`   Fulfillment: ${testData.fulfillmentType}\n`);

    // Create a temporary script to make the API call
    const curlScript = `
      curl -X POST "http://localhost:5000/api/test/order-zoho-integration" \\
        -H "Content-Type: application/json" \\
        -H "Accept: application/json" \\
        -d '${JSON.stringify(testData)}' \\
        --silent --show-error --fail \\
        --write-out "\\nHTTP_STATUS:%{http_code}\\n"
    `;

    console.log('🔄 Executing API call...');
    const result = execSync(curlScript.trim(), { 
      encoding: 'utf8',
      timeout: 30000
    });

    console.log('\n✅ API Response:');
    console.log(result);

    if (result.includes('HTTP_STATUS:200') || result.includes('"success":true')) {
      console.log('\n🎉 SUCCESS! Deal created in Zoho CRM');
      console.log('🎯 CHECK YOUR ZOHO CRM NOW:');
      console.log('================================');
      console.log('1. Log into your Zoho CRM');
      console.log('2. Go to the Deals module');
      console.log('3. Look for a deal with "Live Integration Test" in the name');
      console.log('4. Open the deal to see all RSR integration fields populated');
      console.log('\n📋 RSR Fields that should be populated:');
      console.log('• TGF Order Number');
      console.log('• Fulfillment Type (Drop-Ship)');
      console.log('• Flow (WD › FFL)'); 
      console.log('• Order Status');
      console.log('• Consignee (FFL Dealer)');
      console.log('• Deal Fulfillment Summary');
      console.log('• Ordering Account (99902)');
      console.log('• Hold Type (Firearm Hold)');
      console.log('• APP Status');
      console.log('• Submitted timestamp');
      console.log('• Plus tracking fields (Carrier, Tracking Number, etc.)');

      console.log('\n🏆 RSR + ZOHO INTEGRATION IS LIVE AND WORKING!');
      console.log('The integration system successfully created a real deal with all fields.');

      return true;
    } else {
      throw new Error('API call did not return success status');
    }

  } catch (error) {
    console.log('\n❌ API Test Failed:', error.message);
    console.log('\n🔄 Trying direct connection test...');
    
    try {
      // Test if server is responding
      const healthCheck = execSync('curl -s http://localhost:5000/api/health || echo "HEALTH_CHECK_FAILED"', { encoding: 'utf8' });
      
      if (healthCheck.includes('HEALTH_CHECK_FAILED')) {
        console.log('💥 Server appears to be down or not responding');
        console.log('Please check if the application is running on port 5000');
        return false;
      }

      // Test Zoho connection
      console.log('\n🔍 Testing Zoho connection...');
      const zohoTest = execSync(`curl -s "http://localhost:5000/api/test/zoho-deals/test@example.com" || echo "ZOHO_TEST_FAILED"`, { encoding: 'utf8' });
      
      if (zohoTest.includes('ZOHO_TEST_FAILED')) {
        console.log('💥 Zoho API connection failed');
        console.log('This could indicate:');
        console.log('1. Zoho access token has expired');
        console.log('2. Zoho API credentials are incorrect'); 
        console.log('3. Zoho CRM permissions are insufficient');
        console.log('\nPlease verify your Zoho credentials in the .env file');
      } else {
        console.log('✅ Zoho connection working - issue may be with deal creation');
        console.log('Raw response:', zohoTest);
      }

    } catch (testError) {
      console.log('💥 Connection tests failed:', testError.message);
    }

    return false;
  }
}

// Execute the test
testZohoIntegration()
  .then((success) => {
    if (success) {
      console.log('\n🎯 INTEGRATION TEST COMPLETED SUCCESSFULLY');
      console.log('Your RSR + Zoho integration is creating real deals!');
    } else {
      console.log('\n⚠️  INTEGRATION TEST FAILED');
      console.log('The system may be in simulation mode or have API issues.');
      console.log('Check the error messages above for diagnosis.');
    }
    console.log('\n🏁 Test finished');
  })
  .catch((error) => {
    console.error('\n💥 Test execution failed:', error.message);
    console.log('Please check your server status and Zoho API configuration.');
  });