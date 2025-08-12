#!/usr/bin/env node

/**
 * Create Demo Zoho Order
 * Creates a demonstration firearms compliance order directly in Zoho CRM
 * This bypasses database issues and shows the integration working
 */

import { OrderZohoIntegration } from './server/order-zoho-integration.js';

async function createDemoZohoOrder() {
  console.log('🚀 Creating Demo Firearms Order in Zoho CRM');
  console.log('===========================================\n');

  // Create demonstration order with real firearm
  const demoOrder = {
    orderNumber: `DEMO-FFL-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`,
    totalAmount: 619.99,
    customerEmail: 'demo.firearms.customer@example.com',
    customerName: 'Demo FirearmsCustomer',
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
    orderStatus: 'Pending FFL'
  };

  console.log('📦 Demo Order Details:');
  console.log(`   Order Number: ${demoOrder.orderNumber}`);
  console.log(`   Customer: ${demoOrder.customerName}`);
  console.log(`   Email: ${demoOrder.customerEmail}`);
  console.log(`   Product: ${demoOrder.orderItems[0].productName}`);
  console.log(`   Total: $${demoOrder.totalAmount}`);
  console.log(`   Status: ${demoOrder.orderStatus}`);
  console.log(`   FFL Dealer: ${demoOrder.fflDealerName}`);

  try {
    console.log('\n🔄 Creating order in Zoho CRM...');
    
    const integration = new OrderZohoIntegration();
    const result = await integration.processOrderToDeal(demoOrder);

    if (result.success) {
      console.log('\n✅ SUCCESS! Demo order created in Zoho CRM');
      console.log(`   🏷️  Deal ID: ${result.dealId}`);
      console.log(`   👤 Contact ID: ${result.contactId}`);
      console.log(`   📧 Customer Email: ${demoOrder.customerEmail}`);
      console.log(`   🔫 Product: GLOCK 19 Gen 5`);
      console.log(`   🏪 FFL Dealer: ${demoOrder.fflDealerName}`);
      console.log(`   📋 Status: ${demoOrder.orderStatus}`);

      console.log('\n🎯 WHAT TO CHECK IN ZOHO CRM:');
      console.log('================================');
      console.log('1. Login to your Zoho CRM');
      console.log(`2. Search for Deal: "${demoOrder.orderNumber}"`);
      console.log(`3. Or search for Contact: "${demoOrder.customerEmail}"`);
      console.log('4. Verify deal shows "Pending FFL" status');
      console.log('5. Check all product details are correct');
      console.log('6. Confirm FFL dealer information is present');

      return {
        success: true,
        orderNumber: demoOrder.orderNumber,
        dealId: result.dealId,
        contactId: result.contactId,
        customerEmail: demoOrder.customerEmail
      };

    } else {
      console.log('\n❌ FAILED to create demo order');
      console.log(`   Error: ${result.error}`);
      
      console.log('\n🔧 TROUBLESHOOTING STEPS:');
      console.log('- Check Zoho CRM API access tokens');
      console.log('- Verify Zoho OAuth configuration');
      console.log('- Ensure proper CRM permissions');
      
      return { success: false, error: result.error };
    }

  } catch (error) {
    console.log('\n💥 EXCEPTION during demo order creation');
    console.log(`   ${error.message}`);
    console.log('\nThis indicates a configuration issue:');
    console.log('- Zoho API credentials may be invalid');
    console.log('- Network connectivity problems');
    console.log('- CRM access permissions');
    
    return { success: false, error: error.message };
  }
}

// Execute demo
console.log('🔫 FIREARMS COMPLIANCE → ZOHO CRM DEMO');
console.log('Creating a real firearms order to demonstrate integration\n');

createDemoZohoOrder()
  .then(result => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DEMO RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    if (result.success) {
      console.log('✅ INTEGRATION WORKING: Demo order created successfully');
      console.log(`📄 Order Number: ${result.orderNumber}`);
      console.log(`🏷️  Zoho Deal ID: ${result.dealId}`);
      console.log(`👤 Zoho Contact ID: ${result.contactId}`);
      console.log(`📧 Customer: ${result.customerEmail}`);
      
      console.log('\n🔍 NEXT: Check your Zoho CRM dashboard');
      console.log('The demonstration order should be visible immediately');
      
    } else {
      console.log('❌ INTEGRATION ISSUE: Demo order creation failed');
      console.log(`💬 Error Details: ${result.error}`);
      console.log('\n🛠️  This requires Zoho configuration attention');
    }
  })
  .catch(error => {
    console.error('\n💥 DEMO EXECUTION FAILED:', error.message);
    process.exit(1);
  });