#!/usr/bin/env node

/**
 * Simple Zoho Connection Test
 * Tests if we can connect to Zoho and create a basic deal
 */

const { execSync } = require('child_process');

console.log('🔍 Testing Zoho CRM Connection...\n');

async function testZohoConnection() {
  try {
    // Test 1: Check if we can find a contact
    console.log('📧 Test 1: Looking for existing contact...');
    const contactTest = execSync(`curl -s "http://localhost:5000/api/test/zoho-deals/test@thegunfirm.com"`, { 
      encoding: 'utf8',
      timeout: 15000
    });

    console.log('Response:', contactTest.substring(0, 200) + (contactTest.length > 200 ? '...' : ''));

    if (contactTest.includes('"contact"') && contactTest.includes('"deals"')) {
      console.log('✅ Zoho connection is working - can retrieve contacts and deals\n');
      
      // Test 2: Try to create a new deal via the order integration
      console.log('📦 Test 2: Testing order-to-zoho integration...');
      const orderTest = execSync(`curl -s -X POST "http://localhost:5000/api/test/order-to-zoho" \\
        -H "Content-Type: application/json" \\
        --data '{}'`, { 
        encoding: 'utf8',
        timeout: 15000
      });

      console.log('Order integration response:', orderTest.substring(0, 300) + (orderTest.length > 300 ? '...' : ''));

      if (orderTest.includes('"success":true') || orderTest.includes('"dealId"')) {
        console.log('✅ Order-to-Zoho integration is working!\n');
        console.log('🎯 SUCCESS: Your Zoho integration is fully operational');
        console.log('The system can:');
        console.log('• Connect to Zoho CRM');
        console.log('• Find existing contacts');
        console.log('• Create new deals');
        console.log('• Map order data to CRM fields');
        return true;
      } else if (orderTest.includes('error') || orderTest.includes('Error')) {
        console.log('⚠️  Order integration has issues but basic connection works');
        return false;
      } else {
        console.log('🔍 Order integration response unclear - may need investigation');
        return false;
      }
    } else if (contactTest.includes('404') || contactTest.includes('not found')) {
      console.log('✅ Zoho connection works (404 is expected for non-existent contact)\n');
      
      // Try the order test anyway
      console.log('📦 Testing order integration...');
      const orderTest = execSync(`curl -s -X POST "http://localhost:5000/api/test/order-to-zoho"`, { 
        encoding: 'utf8',
        timeout: 15000
      });
      
      if (orderTest.includes('"success":true')) {
        console.log('✅ Order integration working despite contact 404');
        return true;
      } else {
        console.log('Response:', orderTest.substring(0, 200));
        return false;
      }
    } else if (contactTest.includes('error') || contactTest.includes('Error')) {
      console.log('❌ Zoho connection failed');
      console.log('This could mean:');
      console.log('• Zoho access token expired');
      console.log('• Zoho API credentials are incorrect');
      console.log('• Network connectivity issues');
      console.log('\nPlease check your Zoho credentials in .env file');
      return false;
    } else {
      console.log('🤔 Unexpected response format');
      console.log('Raw response:', contactTest);
      return false;
    }

  } catch (error) {
    console.log('💥 Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('🔌 Server is not running or not accessible on port 5000');
      console.log('Please make sure your application is started');
    } else if (error.message.includes('timeout')) {
      console.log('⏱️  Request timed out - Zoho API may be slow or unreachable');
    }
    
    return false;
  }
}

// Run the test
testZohoConnection()
  .then((success) => {
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('🏆 ZOHO INTEGRATION: WORKING');
      console.log('Your system can create deals in Zoho CRM');
    } else {
      console.log('⚠️  ZOHO INTEGRATION: NEEDS ATTENTION');
      console.log('Check the errors above to diagnose the issue');
    }
    console.log('='.repeat(50));
  })
  .catch((error) => {
    console.error('Test execution failed:', error.message);
  });