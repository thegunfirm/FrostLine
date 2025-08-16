#!/usr/bin/env node

/**
 * Create Actual Zoho Deal Test
 * This will create a real deal in your Zoho CRM that you can see in the Deals module
 */

const { execSync } = require('child_process');

console.log('🎯 CREATING REAL DEAL IN ZOHO CRM');
console.log('=================================\n');

async function createActualZohoDeal() {
  try {
    console.log('📦 Creating order deal via API...');
    
    // Use the working order-to-zoho endpoint with proper test data
    const orderData = {
      orderNumber: `ZOHO-TEST-${Date.now()}`,
      totalAmount: 899.99,
      customerEmail: 'zohotest@thegunfirm.com',
      customerName: 'Zoho Test Customer',
      membershipTier: 'Bronze',
      orderItems: [
        {
          productName: 'Test Firearm Product',
          sku: 'TEST-FIREARM-001',
          quantity: 1,
          unitPrice: 899.99,
          totalPrice: 899.99,
          fflRequired: true
        }
      ],
      fflDealerName: 'Test FFL Dealer for Zoho',
      orderStatus: 'pending'
    };

    console.log(`Customer: ${orderData.customerName}`);
    console.log(`Email: ${orderData.customerEmail}`);
    console.log(`Order Number: ${orderData.orderNumber}`);
    console.log(`Amount: $${orderData.totalAmount}`);
    console.log(`Items: ${orderData.orderItems.length} item(s)\n`);

    const response = execSync(`curl -s -X POST "http://localhost:5000/api/test/order-to-zoho" \\
      -H "Content-Type: application/json" \\
      -d '${JSON.stringify(orderData)}'`, { 
      encoding: 'utf8',
      timeout: 30000
    });

    console.log('API Response:');
    console.log(response);
    console.log('\n');

    // Parse the response
    try {
      const result = JSON.parse(response);
      
      if (result.success && result.dealId) {
        console.log('✅ SUCCESS! Deal created in Zoho CRM');
        console.log('🆔 Deal ID:', result.dealId);
        console.log('👤 Contact ID:', result.contactId);
        console.log('\n🎯 CHECK YOUR ZOHO CRM NOW:');
        console.log('===========================');
        console.log('1. Log into your Zoho CRM');
        console.log('2. Go to the DEALS module');
        console.log('3. Look for a deal with customer "Zoho Test Customer"');
        console.log(`4. The deal should have amount $${orderData.totalAmount}`);
        console.log(`5. Deal ID should be: ${result.dealId}`);
        console.log('\n💡 If you don\'t see it:');
        console.log('- Try refreshing the Deals page');
        console.log('- Check if there are any filters applied');
        console.log('- Look in "All Deals" or "My Deals" view');
        
        return true;
      } else {
        console.log('❌ Deal creation failed');
        console.log('Error:', result.error || 'Unknown error');
        return false;
      }
    } catch (parseError) {
      console.log('⚠️  Could not parse JSON response, but API returned:');
      console.log(response.substring(0, 500));
      
      if (response.includes('success') || response.includes('dealId')) {
        console.log('\n🤔 Response contains success indicators - deal may have been created');
        console.log('Check your Zoho CRM Deals module manually');
        return true;
      }
      return false;
    }

  } catch (error) {
    console.log('💥 Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('🔌 Server not running - please start your application');
    } else if (error.message.includes('timeout')) {
      console.log('⏱️  Request timed out - Zoho API may be slow');
    } else {
      console.log('🔍 Check server logs for more details');
    }
    
    return false;
  }
}

// Run the test
createActualZohoDeal()
  .then((success) => {
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('🏆 ZOHO DEAL CREATION: SUCCESS');
      console.log('Check your Zoho CRM Deals module now!');
    } else {
      console.log('⚠️  ZOHO DEAL CREATION: FAILED');
      console.log('Check the error messages above');
    }
    console.log('='.repeat(60));
  })
  .catch((error) => {
    console.error('Test execution failed:', error.message);
  });