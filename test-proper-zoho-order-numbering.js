#!/usr/bin/env node

/**
 * Test Script: Proper TGF Order Numbering with Zoho Integration
 * 
 * Creates test orders using the new proper order numbering specification
 */

import { ZohoOrderIntegrationService } from './server/order-zoho-integration.js';

const integrationService = new ZohoOrderIntegrationService();

const testOrderData = {
  // Test order configuration
  orderNumber: 'TEST-PROPER-001',
  customerEmail: 'test.customer@example.com',
  customerName: 'Test Customer',
  totalAmount: 899.99,
  membershipTier: 'Bronze',
  isTestOrder: true, // Enable TEST prefix
  
  // Test single group order (non-firearm to customer)
  orderItems: [
    {
      productName: 'Test Scope 4-16x50',
      sku: 'SCOPE-TEST-001',
      quantity: 1,
      unitPrice: 899.99,
      totalPrice: 899.99,
      fflRequired: false,
      dropShipEligible: true,
      inHouseOnly: false,
      rsrStockNumber: 'SCOPE001'
    }
  ]
};

const multiGroupOrderData = {
  // Test order configuration
  orderNumber: 'TEST-PROPER-002',
  customerEmail: 'test.customer@example.com',
  customerName: 'Test Customer',
  totalAmount: 1599.98,
  membershipTier: 'Gold',
  isTestOrder: true, // Enable TEST prefix
  
  // Test multiple group order (firearm + accessory)
  orderItems: [
    {
      productName: 'Test Rifle Platform',
      sku: 'RIFLE-TEST-001',
      quantity: 1,
      unitPrice: 899.99,
      totalPrice: 899.99,
      fflRequired: true,
      dropShipEligible: true,
      inHouseOnly: false,
      rsrStockNumber: 'RIFLE001'
    },
    {
      productName: 'Test Cleaning Kit',
      sku: 'KIT-TEST-001',
      quantity: 1,
      unitPrice: 699.99,
      totalPrice: 699.99,
      fflRequired: false,
      dropShipEligible: true,
      inHouseOnly: false,
      rsrStockNumber: 'KIT001'
    }
  ]
};

async function testProperOrderNumbering() {
  console.log('🧪 TESTING PROPER TGF ORDER NUMBERING WITH ZOHO INTEGRATION\n');

  try {
    // Test 1: Single group order
    console.log('📋 TEST 1: Single Group Order (Non-Firearm → Customer)');
    console.log(`   Expected: test{7digits}0 for TGF Order`);
    console.log(`   Expected: test{7digits}0 for Deal Name`);
    
    const singleResult = await integrationService.processOrderWithRSRFields(testOrderData);
    
    if (singleResult.success) {
      console.log(`✅ Single group order created successfully:`);
      console.log(`   Deal ID: ${singleResult.dealId}`);
      console.log(`   TGF Order Number: ${singleResult.tgfOrderNumber}`);
      console.log(`   Zoho Fields:`, JSON.stringify(singleResult.zohoFields, null, 2));
    } else {
      console.log(`❌ Single group order failed: ${singleResult.error}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Test 2: Multiple group order with splitting
    console.log('📋 TEST 2: Multiple Group Order (Firearm + Accessory)');
    console.log(`   Expected: test{7digits}A for Firearm (FFL Group)`);
    console.log(`   Expected: test{7digits}B for Accessory (Customer Group)`);
    console.log(`   Expected: test{7digits}Z for Deal Name`);
    
    const multiResult = await integrationService.processOrderWithSplitting(multiGroupOrderData);
    
    if (multiResult.success) {
      console.log(`✅ Multiple group order created successfully:`);
      console.log(`   Total Orders: ${multiResult.totalOrders}`);
      
      multiResult.orders.forEach((order, index) => {
        console.log(`\n   Order ${index + 1}:`);
        console.log(`     Deal ID: ${order.dealId}`);
        console.log(`     TGF Order Number: ${order.tgfOrderNumber}`);
        console.log(`     Outcome: ${order.outcome}`);
        console.log(`     Consignee: ${order.zohoFields?.Consignee || 'N/A'}`);
        console.log(`     Fulfillment: ${order.zohoFields?.Fulfillment_Type || 'N/A'}`);
      });
    } else {
      console.log(`❌ Multiple group order failed: ${multiResult.error}`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testProperOrderNumbering().then(() => {
  console.log('\n✅ PROPER ORDER NUMBERING TEST COMPLETE');
}).catch(error => {
  console.error('❌ Test execution failed:', error.message);
});