/**
 * Test complete order processing with product creation
 */

async function testOrderProcessing() {
  try {
    console.log('🧪 Testing complete order processing with product creation...');
    
    // Import the working order integration
    const { OrderZohoIntegration } = await import('./server/order-zoho-integration.js');
    const orderIntegration = new OrderZohoIntegration();

    // Create test order with real product data
    const testOrder = {
      orderNumber: `TEST-${Date.now().toString().slice(-7)}`,
      totalAmount: 649.99,
      customerEmail: 'test.user@thegunfirm.com',
      customerName: 'Test User',
      membershipTier: 'Gold',
      orderItems: [
        {
          productName: 'Smith & Wesson M&P Shield 9mm',
          sku: 'SW-MP-SHIELD-9MM',
          quantity: 1,
          unitPrice: 399.99,
          totalPrice: 399.99,
          fflRequired: true,
          manufacturer: 'Smith & Wesson',
          category: 'Handguns',
          rsrStockNumber: 'SW123456',
          distributor: 'RSR'
        },
        {
          productName: 'Federal Premium 9mm 124gr HST',
          sku: 'FED-9MM-HST-124',
          quantity: 2,
          unitPrice: 125.00,
          totalPrice: 250.00,
          fflRequired: false,
          manufacturer: 'Federal',
          category: 'Ammunition',
          rsrStockNumber: 'FED987654',
          distributor: 'RSR'
        }
      ],
      isTestOrder: true,
      fulfillmentType: 'Drop-Ship',
      orderingAccount: '99901'
    };

    console.log(`📋 Processing order: ${testOrder.orderNumber}`);
    console.log(`🎯 Order items: ${testOrder.orderItems.length}`);

    // Process the order - this should create products if needed
    const result = await orderIntegration.processOrderWithRSRFields(testOrder);

    console.log('🔍 Order processing result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Order processed successfully!');
      console.log(`📄 Deal ID: ${result.dealId}`);
      console.log(`🔢 TGF Order Number: ${result.tgfOrderNumber}`);
      
      // Now let's verify the products were created
      console.log('\n🔍 Verifying product creation...');
      
      for (const item of testOrder.orderItems) {
        try {
          const productResult = await orderIntegration.createProduct(item.sku, {
            productName: item.productName,
            manufacturer: item.manufacturer,
            category: item.category,
            fflRequired: item.fflRequired,
            rsrStockNumber: item.rsrStockNumber,
            distributor: item.distributor
          });
          
          console.log(`📦 Product ${item.sku}: ${productResult ? 'Created/Found' : 'Failed'}`);
        } catch (error) {
          console.log(`❌ Product ${item.sku}: ${error.message}`);
        }
      }

    } else {
      console.log('❌ Order processing failed:', result.error);
    }

    return result;

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

testOrderProcessing().then(result => {
  console.log('\n🏁 Final result:', result.success ? 'SUCCESS' : 'FAILED');
}).catch(err => {
  console.error('💥 Critical error:', err);
});