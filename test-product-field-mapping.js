#!/usr/bin/env node

/**
 * Test Product Field Mapping in Zoho Deal Creation
 * This script tests the enhanced order splitting system with product information mapping
 */

import { OrderZohoIntegration } from './server/order-zoho-integration.js';

async function testProductFieldMapping() {
  console.log('🧪 Testing Product Field Mapping for Zoho Deal Creation...\n');

  const orderIntegration = new OrderZohoIntegration();

  // Test Case 1: Single Product Order with Full Product Information
  console.log('📦 Test Case 1: Single Product Order with Full Product Data');
  const singleProductOrder = {
    orderNumber: 'TGF-TEST-001',
    totalAmount: 549.99,
    customerEmail: 'testcustomer@example.com',
    customerName: 'John Test Customer',
    membershipTier: 'Gold Monthly',
    orderItems: [{
      productName: 'Smith & Wesson M&P Shield Plus 9mm',
      sku: 'SW-MP-SHIELD-PLUS-9MM',
      rsrStockNumber: 'RSR123456',
      quantity: 1,
      unitPrice: 549.99,
      totalPrice: 549.99,
      fflRequired: true,
      dropShipEligible: true,
      inHouseOnly: false,
      category: 'Handguns',
      manufacturer: 'Smith & Wesson',
      description: 'Compact striker-fired pistol perfect for concealed carry',
      specifications: 'Barrel: 3.1", Capacity: 10+1/13+1, Weight: 20.2 oz, Trigger: 5.5-6.5 lbs',
      images: ['https://rsrgroup.com/images/SW-MP-SHIELD-PLUS-9MM.jpg']
    }],
    fflDealerName: 'Test FFL Dealer',
    orderStatus: 'Submitted',
    fulfillmentType: 'Drop-Ship',
    orderingAccount: '99902',
    requiresDropShip: true,
    isTestOrder: true
  };

  try {
    const result1 = await orderIntegration.processOrderWithRSRFields(singleProductOrder);
    
    if (result1.success) {
      console.log(`✅ Single product order created successfully:`);
      console.log(`   Deal ID: ${result1.dealId}`);
      console.log(`   TGF Order Number: ${result1.tgfOrderNumber}`);
      console.log(`   Product mapped: ${singleProductOrder.orderItems[0].productName}`);
    } else {
      console.log(`❌ Single product order failed: ${result1.error}`);
    }
  } catch (error) {
    console.log(`❌ Single product order error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test Case 2: Multiple Product Order (Mixed Order)
  console.log('📦 Test Case 2: Multiple Product Order (Mixed Order)');
  const multiProductOrder = {
    orderNumber: 'TGF-TEST-002',
    totalAmount: 1299.97,
    customerEmail: 'testcustomer2@example.com',
    customerName: 'Jane Test Customer',
    membershipTier: 'Platinum Monthly',
    orderItems: [
      {
        productName: 'Glock 19 Gen 5',
        sku: 'GLOCK-19-GEN5',
        rsrStockNumber: 'RSR654321',
        quantity: 1,
        unitPrice: 599.99,
        totalPrice: 599.99,
        fflRequired: true,
        category: 'Handguns',
        manufacturer: 'Glock'
      },
      {
        productName: 'Magpul PMAG 30 AR/M4 GEN M3',
        sku: 'MAGPUL-PMAG-30-M3',
        rsrStockNumber: 'RSR789012',
        quantity: 5,
        unitPrice: 15.99,
        totalPrice: 79.95,
        fflRequired: false,
        category: 'Magazines',
        manufacturer: 'Magpul'
      },
      {
        productName: 'Federal Premium 9mm 124gr HST',
        sku: 'FED-9MM-124-HST',
        rsrStockNumber: 'RSR345678',
        quantity: 10,
        unitPrice: 32.99,
        totalPrice: 329.90,
        fflRequired: false,
        category: 'Ammunition',
        manufacturer: 'Federal'
      },
      {
        productName: 'Streamlight TLR-1 HL',
        sku: 'STREAMLIGHT-TLR1-HL',
        rsrStockNumber: 'RSR901234',
        quantity: 1,
        unitPrice: 159.99,
        totalPrice: 159.99,
        fflRequired: false,
        category: 'Accessories',
        manufacturer: 'Streamlight'
      }
    ],
    fflDealerName: 'Test FFL Dealer',
    orderStatus: 'Submitted',
    fulfillmentType: 'In-House',
    orderingAccount: '99901',
    requiresDropShip: false,
    isTestOrder: true
  };

  try {
    const result2 = await orderIntegration.processOrderWithRSRFields(multiProductOrder);
    
    if (result2.success) {
      console.log(`✅ Multiple product order created successfully:`);
      console.log(`   Deal ID: ${result2.dealId}`);
      console.log(`   TGF Order Number: ${result2.tgfOrderNumber}`);
      console.log(`   Products: ${multiProductOrder.orderItems.length} items`);
      console.log(`   Total Value: $${multiProductOrder.totalAmount}`);
    } else {
      console.log(`❌ Multiple product order failed: ${result2.error}`);
    }
  } catch (error) {
    console.log(`❌ Multiple product order error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test Case 3: Product Field Validation
  console.log('🔍 Test Case 3: Product Field Validation');
  
  // Import the service directly for testing
  const { zohoOrderFieldsService } = await import('./server/services/zoho-order-fields-service.js');
  
  const testProduct = {
    productName: 'Test Product',
    sku: 'TEST-SKU-001',
    quantity: 1,
    unitPrice: 99.99
  };
  
  const mappedFields = zohoOrderFieldsService.mapProductToZohoDeal(testProduct, 99.99);
  const validation = zohoOrderFieldsService.validateProductFields(mappedFields);
  
  console.log('Mapped Product Fields:');
  console.log(JSON.stringify(mappedFields, null, 2));
  console.log(`\nValidation Result: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`);
  if (!validation.valid) {
    console.log('Validation Errors:', validation.errors);
  }

  console.log('\n🎯 Product Field Mapping Test Completed!');
}

// Run the test
testProductFieldMapping().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});