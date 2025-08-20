/**
 * Standalone test for Zoho deal creation - bypasses TypeScript errors in routes
 */

// Use CommonJS require instead since this is a .js file
const { OrderZohoIntegration } = require('./server/order-zoho-integration');

async function testZohoDealCreation() {
  console.log('🧪 Testing Zoho Deal Creation (Standalone)');
  console.log('==========================================');
  
  try {
    // Create order-zoho integration instance
    const orderZohoIntegration = new OrderZohoIntegration();
    
    // Test data simulating a cart order
    const testOrderData = {
      orderNumber: `TEST-${Date.now()}`,
      totalAmount: 647.00, // Bronze tier price for GLOCK 17 GEN5
      customerEmail: 'ordertest@example.com',
      customerName: 'John OrderTest',
      membershipTier: 'Bronze',
      orderItems: [{
        productName: 'GLOCK 17 GEN5 9MM 4.49" BBL 17RDS FS',
        sku: 'PA175S203',
        manufacturerPartNumber: 'PA175S203',
        rsrStockNumber: 'GLPA175S203', // Mock RSR format
        quantity: 1,
        unitPrice: 647.00,
        totalPrice: 647.00,
        fflRequired: true,
        manufacturer: 'GLOCK',
        category: 'Handguns',
        upcCode: '764503913617'
      }],
      fflDealerName: 'Test FFL Dealer',
      orderStatus: 'pending',
      isTestOrder: true
    };
    
    console.log('📋 Test order data:');
    console.log(JSON.stringify(testOrderData, null, 2));
    
    console.log('\n🔄 Calling processOrderToDeal...');
    const result = await orderZohoIntegration.processOrderToDeal(testOrderData);
    
    console.log('\n📥 Zoho integration result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`\n✅ SUCCESS: Deal created with ID: ${result.dealId}`);
      console.log('🔍 Check Zoho CRM Deals module for:');
      console.log(`   - Deal Name: ${testOrderData.orderNumber}`);
      console.log(`   - Amount: $${testOrderData.totalAmount}`);
      console.log(`   - Subform entries with product details`);
    } else {
      console.log(`\n❌ FAILED: ${result.error}`);
      console.log('This explains why cart orders are not creating deals with subforms.');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testZohoDealCreation();