const axios = require('axios');

console.log('🔧 Debug Deal Creation - Testing simple vs system fields');

async function testSimpleDeal() {
  try {
    // Test 1: Create deal WITHOUT system fields (should work)
    console.log('\n📋 Test 1: Simple deal creation (no system fields)');
    const simpleResponse = await axios.post('http://localhost:5000/api/test/zoho-system-fields', {
      orderNumber: 'DEBUG-SIMPLE-' + Date.now(),
      customerEmail: `debug.simple.${Date.now()}@thegunfirm.com`,
      customerName: 'Debug Simple User',
      membershipTier: 'Bronze',
      totalAmount: 100,
      orderItems: [{
        productName: 'Debug Simple Item',
        sku: 'DEBUG-SIMPLE',
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        fflRequired: false
      }],
      fulfillmentType: 'In-House',
      requiresDropShip: false,
      holdType: undefined,
      fflDealerName: undefined,
      isTestOrder: true
    });

    console.log('Simple deal result:', simpleResponse.data);
    
  } catch (error) {
    console.error('Error testing simple deal:', error.response?.data || error.message);
  }
}

testSimpleDeal().then(() => {
  console.log('\n🔧 Debug test completed');
  process.exit(0);
}).catch(error => {
  console.error('Debug test failed:', error);
  process.exit(1);
});