#!/usr/bin/env node

/**
 * Direct Zoho Sync Test
 * Tests the OrderZohoIntegration class directly to verify Zoho connectivity
 */

import { OrderZohoIntegration } from './server/order-zoho-integration.js';

const TEST_ORDER_DATA = {
  orderNumber: 'TEST-FFL-' + Date.now(),
  totalAmount: 619.99,
  customerEmail: 'zoho.firearms.test@example.com',
  customerName: 'ZohoTest FirearmsCustomer',
  membershipTier: 'Bronze',
  orderItems: [{
    productName: 'GLOCK 19 Gen 5 9mm Luger 4.02" Barrel 15-Round',
    sku: 'GLOCK19GEN5',
    quantity: 1,
    unitPrice: 619.99,
    totalPrice: 619.99,
    fflRequired: true
  }],
  fflDealerName: 'Lone Star Gun Store',
  orderStatus: 'Pending FFL',
  zohoContactId: undefined
};

async function testDirectZohoSync() {
  console.log('🔍 Testing Direct Zoho Integration');
  console.log('==================================\n');

  try {
    console.log('📝 Creating OrderZohoIntegration instance...');
    const orderZohoIntegration = new OrderZohoIntegration();
    
    console.log('📦 Test Order Data:');
    console.log(`   Order Number: ${TEST_ORDER_DATA.orderNumber}`);
    console.log(`   Customer: ${TEST_ORDER_DATA.customerName}`);
    console.log(`   Email: ${TEST_ORDER_DATA.customerEmail}`);
    console.log(`   Total: $${TEST_ORDER_DATA.totalAmount}`);
    console.log(`   Status: ${TEST_ORDER_DATA.orderStatus}`);
    console.log(`   Product: ${TEST_ORDER_DATA.orderItems[0].productName}`);
    
    console.log('\n🔄 Processing order to Zoho Deal...');
    const result = await orderZohoIntegration.processOrderToDeal(TEST_ORDER_DATA);
    
    if (result.success) {
      console.log('\n✅ ZOHO INTEGRATION SUCCESS!');
      console.log(`   Deal ID: ${result.dealId}`);
      console.log(`   Contact ID: ${result.contactId}`);
      console.log('\n🎉 Your demonstration order is now in Zoho CRM!');
      console.log(`Search for: "${TEST_ORDER_DATA.orderNumber}" or "${TEST_ORDER_DATA.customerEmail}"`);
      
      return {
        success: true,
        dealId: result.dealId,
        contactId: result.contactId,
        orderNumber: TEST_ORDER_DATA.orderNumber
      };
    } else {
      console.log('\n❌ ZOHO INTEGRATION FAILED');
      console.log(`   Error: ${result.error}`);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.log('\n💥 INTEGRATION ERROR');
    console.log(`   ${error.message}`);
    console.log('\nThis suggests a configuration or connectivity issue:');
    console.log('- Check ZOHO_ACCESS_TOKEN is valid');
    console.log('- Verify ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET');
    console.log('- Ensure Zoho CRM API access is enabled');
    
    return { success: false, error: error.message };
  }
}

// Run the test
console.log('🚀 DIRECT ZOHO SYNC TEST');
console.log('Testing: OrderZohoIntegration.processOrderToDeal()');
console.log('Purpose: Verify that firearms compliance orders sync to Zoho CRM\n');

testDirectZohoSync()
  .then(result => {
    console.log('\n' + '='.repeat(50));
    console.log('📋 DIRECT ZOHO SYNC TEST RESULTS');
    console.log('='.repeat(50));
    
    if (result.success) {
      console.log('✅ SUCCESS: Zoho integration is working correctly');
      console.log(`📄 Deal ID: ${result.dealId}`);
      console.log(`👤 Contact ID: ${result.contactId}`);
      console.log(`🏷️  Order Number: ${result.orderNumber}`);
      console.log('\n🔍 Next: Check your Zoho CRM for the new deal');
    } else {
      console.log('❌ FAILED: Zoho integration needs attention');
      console.log(`💬 Error: ${result.error}`);
      console.log('\n🔧 Troubleshooting needed for Zoho connectivity');
    }
  })
  .catch(error => {
    console.error('\n💥 TEST EXECUTION FAILED:', error);
    process.exit(1);
  });