const http = require('http');

// Test Bronze tier SP00735 order with correct endpoint
async function testBronzeOrder() {
  try {
    console.log('🥉 TESTING BRONZE TIER ORDER FOR SP00735');
    console.log('=' .repeat(50));
    
    const checkoutPayload = {
      cartItems: [{
        id: 134157,
        quantity: 1,
        price: 7.00,
        name: "GLOCK OEM 8 POUND CONNECTOR",
        manufacturerPartNumber: "SP00735",
        sku: "GLSP00735",
        requiresFFL: false,
        isFirearm: false
      }],
      userId: 1,
      fflRecipientId: 1414,
      shippingAddress: {
        street: "123 Test St",
        city: "Austin",
        state: "TX", 
        zipCode: "78701"
      },
      totalAmount: 7.00,
      membershipTier: "Bronze"
    };

    console.log('📦 Order Details:');
    console.log(`Product: ${checkoutPayload.cartItems[0].name}`);
    console.log(`Manufacturer Part #: ${checkoutPayload.cartItems[0].manufacturerPartNumber}`);
    console.log(`RSR Stock #: ${checkoutPayload.cartItems[0].sku}`);
    console.log(`Price: $${checkoutPayload.cartItems[0].price}`);
    console.log(`Tier: ${checkoutPayload.membershipTier}`);
    console.log(`User ID: ${checkoutPayload.userId}`);
    console.log(`FFL ID: ${checkoutPayload.fflRecipientId}`);
    console.log('');

    const result = await makeCheckoutRequest(checkoutPayload);
    
    console.log('📋 RESULT:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ BRONZE ORDER SUCCESS:');
      console.log(`Order ID: ${result.order?.id}`);
      console.log(`Order Number: ${result.order?.orderNumber}`);
      console.log(`Status: ${result.order?.status}`);
      console.log(`Hold: ${result.order?.hold ? 'Yes' : 'No'}`);
      if (result.order?.dealId) {
        console.log(`Zoho Deal ID: ${result.order.dealId}`);
      }
      
      console.log('\n🔍 ZOHO VALIDATION:');
      console.log('✅ Products Module should contain:');
      console.log('   - Product_Code: SP00735');
      console.log('   - Product_Name: GLOCK OEM 8 POUND CONNECTOR');
      console.log('   - Manufacturer: GLOCK');
      console.log('');
      console.log('✅ Deal subform should contain:');
      console.log('   - Product Code (SKU): SP00735');
      console.log('   - Distributor Part Number: GLSP00735');
      console.log('   - Distributor: RSR');
      console.log('   - Unit Price: $7.00');
      console.log('   - Quantity: 1');
      console.log('   - Amount: $7.00');
    } else {
      console.log(`\n❌ BRONZE ORDER FAILED: ${result.error}`);
    }

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

async function makeCheckoutRequest(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/firearms-compliance/checkout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(responseBody);
          resolve(result);
        } catch (e) {
          console.log('Raw response:', responseBody);
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

testBronzeOrder();