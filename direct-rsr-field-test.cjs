#!/usr/bin/env node

/**
 * Direct RSR Field Test
 * Tests the comprehensive RSR field mapping directly without API routes
 */

console.log('🎯 DIRECT RSR FIELD MAPPING TEST');
console.log('=================================\n');

async function testDirectRSRFields() {
  try {
    console.log('📦 Loading OrderZohoIntegration...');
    
    // Dynamically import the integration service
    const integrationModule = await import('./server/order-zoho-integration.js');
    const { OrderZohoIntegration } = integrationModule;
    
    console.log('✅ OrderZohoIntegration loaded successfully');
    
    // Create integration instance
    const orderZohoIntegration = new OrderZohoIntegration();
    console.log('✅ OrderZohoIntegration instance created');

    // Build comprehensive test data
    const testOrderData = {
      orderNumber: `RSR-FIELDS-TEST-${Date.now()}`,
      totalAmount: 1299.99,
      customerEmail: 'rsrfieldtest@thegunfirm.com',
      customerName: 'RSR Fields Test Customer',
      membershipTier: 'Bronze',
      orderItems: [
        {
          productName: 'GLOCK 19 Gen 5 9mm Luger',
          sku: 'PI1950203',
          rsrStockNumber: 'PI1950203',
          quantity: 1,
          unitPrice: 1299.99,
          totalPrice: 1299.99,
          fflRequired: true
        }
      ],
      fflDealerName: 'RSR Test FFL Dealer',
      orderStatus: 'pending',
      fulfillmentType: 'Drop-Ship',
      orderingAccount: '99902',
      requiresDropShip: true,
      holdType: 'FFL not on file',
      isTestOrder: true
    };

    console.log('🔄 Processing order with comprehensive RSR field mapping...');
    console.log(`Order Number: ${testOrderData.orderNumber}`);
    console.log(`Fulfillment: ${testOrderData.fulfillmentType}`);
    console.log(`Account: ${testOrderData.orderingAccount}`);
    console.log(`Hold Type: ${testOrderData.holdType}\n`);

    // Call the comprehensive RSR field mapping method
    const result = await orderZohoIntegration.processOrderWithRSRFields(testOrderData);

    if (result.success) {
      console.log('🏆 SUCCESS! Comprehensive RSR deal created with all fields');
      console.log(`🆔 Deal ID: ${result.dealId}`);
      console.log(`📊 TGF Order Number: ${result.tgfOrderNumber}`);
      
      console.log('\n📋 RSR Fields Populated in Zoho CRM:');
      console.log('=====================================');
      
      if (result.zohoFields) {
        Object.entries(result.zohoFields).forEach(([key, value]) => {
          if (value) {
            console.log(`✓ ${key}: ${value}`);
          }
        });
      }
      
      console.log('\n🎯 VERIFY IN YOUR ZOHO CRM:');
      console.log('============================');
      console.log('1. Open your Zoho CRM');
      console.log('2. Navigate to DEALS module');
      console.log('3. Find: "RSR Fields Test Customer"');
      console.log(`4. Deal ID: ${result.dealId}`);
      console.log(`5. TGF Order: ${result.tgfOrderNumber}`);
      console.log('\n6. Confirm ALL these RSR fields are populated:');
      console.log('   ✓ TGF Order Number');
      console.log('   ✓ Fulfillment Type (Drop-Ship)');
      console.log('   ✓ Flow (WD › FFL)');
      console.log('   ✓ Order Status');
      console.log('   ✓ Consignee');
      console.log('   ✓ Deal Fulfillment Summary');
      console.log('   ✓ Ordering Account (99902)');
      console.log('   ✓ Hold Type (FFL not on file)');
      console.log('   ✓ APP Status');
      console.log('   ✓ Submitted timestamp');
      console.log('   ✓ All tracking fields');
      
      return true;
    } else {
      console.log('❌ RSR field mapping failed');
      console.log(`Error: ${result.error}`);
      return false;
    }

  } catch (error) {
    console.log('💥 Direct test failed:', error.message);
    console.log('Stack trace:', error.stack);
    return false;
  }
}

// Run the direct test
testDirectRSRFields()
  .then((success) => {
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('🏆 DIRECT RSR FIELD MAPPING: SUCCESS!');
      console.log('All 13+ RSR integration fields should be populated in Zoho CRM!');
    } else {
      console.log('⚠️  DIRECT RSR FIELD MAPPING: FAILED');
      console.log('Check error messages above');
    }
    console.log('='.repeat(60));
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test execution failed:', error.message);
    process.exit(1);
  });