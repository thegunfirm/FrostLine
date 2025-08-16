#!/usr/bin/env node

/**
 * Direct Zoho Integration Test
 * 
 * Directly creates deals in Zoho CRM using the server-side integration
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

// Import the integration services directly from TypeScript files
async function createZohoDealsDirectly() {
  console.log('\n🎯 DIRECT ZOHO DEAL CREATION TEST');
  console.log('==================================');

  try {
    // Compile and run a TypeScript script that uses our integration services
    const testScript = `
import { OrderZohoIntegration } from './server/order-zoho-integration';
import { ZohoOrderFieldsService } from './server/services/zoho-order-fields-service';

const testOrders = [
  {
    customerEmail: 'bronze.test@thegunfirm.com',
    customerName: 'Bronze Test Customer',
    customerTier: 'Bronze',
    totalAmount: 619.99,
    fulfillmentType: 'Drop-Ship',
    items: [{
      name: 'GLOCK 19 Gen 5 9mm Luger',
      sku: 'PI1950203',
      price: 619.99,
      quantity: 1,
      isFirearm: true
    }],
    fflDealer: {
      businessName: 'BACK ACRE GUN WORKS',
      licenseNumber: '1-59-017-07-6F-13700'
    }
  },
  {
    customerEmail: 'gold.test@thegunfirm.com',
    customerName: 'Gold Test Customer',
    customerTier: 'Gold Monthly',
    totalAmount: 2227.75,
    fulfillmentType: 'In-House',
    items: [{
      name: 'DSA SA58 IBR 18" 308WIN',
      sku: 'DSA5818-IBR-A',
      price: 2227.75,
      quantity: 1,
      isFirearm: true
    }],
    fflDealer: {
      businessName: 'BACK ACRE GUN WORKS',
      licenseNumber: '1-59-017-07-6F-13700'
    }
  }
];

async function runTest() {
  console.log('🔄 Initializing Zoho integration services...');
  
  const zohoIntegration = new OrderZohoIntegration();
  const fieldService = new ZohoOrderFieldsService();
  
  for (let i = 0; i < testOrders.length; i++) {
    const order = testOrders[i];
    console.log(\`\\n📦 Creating deal \${i + 1}/\${testOrders.length}: \${order.customerTier}\`);
    
    try {
      // Generate order number
      const orderNumber = await fieldService.generateOrderNumber('I');
      console.log(\`   🎯 Order Number: \${orderNumber}\`);
      
      // Create order data for integration
      const orderData = {
        id: orderNumber,
        userId: 'test-user-' + i,
        orderDate: new Date(),
        totalPrice: order.totalAmount,
        status: 'Pending',
        items: order.items.map(item => ({
          productId: 1,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          product: item
        })),
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        customerTier: order.customerTier,
        fulfillmentType: order.fulfillmentType,
        fflDealer: order.fflDealer,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log(\`   🔄 Processing through Zoho integration...\`);
      
      const result = await zohoIntegration.processOrder(orderData);
      
      if (result.success) {
        console.log(\`   ✅ Deal created successfully!\`);
        console.log(\`   🆔 Deal ID: \${result.dealId}\`);
        console.log(\`   👤 Contact ID: \${result.contactId}\`);
      } else {
        console.log(\`   ❌ Deal creation failed: \${result.error}\`);
      }
      
      // Wait between requests
      if (i < testOrders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(\`   💥 Error: \${error.message}\`);
    }
  }
  
  console.log('\\n🏁 Direct Zoho test completed');
}

runTest().catch(console.error);
`;

    // Save the test script
    const scriptPath = './temp-zoho-test.ts';
    require('fs').writeFileSync(scriptPath, testScript);

    console.log('📝 Running direct Zoho integration test...');
    
    // Run the TypeScript file directly
    execSync(`npx tsx ${scriptPath}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    // Clean up
    require('fs').unlinkSync(scriptPath);

  } catch (error) {
    console.error('💥 Direct test failed:', error.message);
  }
}

createZohoDealsDirectly();