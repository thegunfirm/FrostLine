const http = require('http');

// Submit actual SP00735 orders for all tiers via checkout API
async function submitTierOrders() {
  try {
    console.log('🚀 Submitting SP00735 orders across all membership tiers');
    console.log('=' .repeat(70));
    
    // Order data for each tier
    const orders = [
      {
        tier: 'Bronze',
        userId: 1,
        email: 'bronze.test@example.com',
        expectedPrice: 7.00
      },
      {
        tier: 'Gold', 
        userId: 2,
        email: 'gold.test@example.com',
        expectedPrice: 6.65
      },
      {
        tier: 'Platinum',
        userId: 3, 
        email: 'platinum.test@example.com',
        expectedPrice: 3.57
      }
    ];

    // Product and FFL data
    const productId = 134157; // SP00735 GLOCK connector
    const fflId = 1414;       // BACK ACRE GUN WORKS

    for (const order of orders) {
      console.log(`\n📦 SUBMITTING ${order.tier.toUpperCase()} TIER ORDER:`);
      console.log(`User: ${order.email} (ID: ${order.userId})`);
      console.log(`Expected Price: $${order.expectedPrice.toFixed(2)}`);
      
      const checkoutPayload = {
        cartItems: [{
          id: productId,
          quantity: 1,
          price: order.expectedPrice,
          name: "GLOCK OEM 8 POUND CONNECTOR",
          manufacturerPartNumber: "SP00735",
          sku: "GLSP00735",
          requiresFFL: false,
          isFirearm: false
        }],
        userId: order.userId,
        fflRecipientId: fflId, // Use real FFL even though not required
        shippingAddress: {
          street: "123 Test St",
          city: "Austin", 
          state: "TX",
          zipCode: "78701"
        },
        totalAmount: order.expectedPrice,
        membershipTier: order.tier
      };

      try {
        const result = await makeCheckoutRequest(checkoutPayload);
        
        if (result.success) {
          console.log(`✅ ${order.tier} order created successfully!`);
          console.log(`   Order Number: ${result.orderNumber}`);
          console.log(`   Order ID: ${result.orderId}`);
          if (result.zohoResult?.dealId) {
            console.log(`   Zoho Deal ID: ${result.zohoResult.dealId}`);
          }
          
          // Validate Zoho integration
          console.log('\n🔍 ZOHO INTEGRATION VALIDATION:');
          console.log(`   Products Module: Should contain SP00735 with static info`);
          console.log(`   Deal Subform: Should contain GLSP00735 + $${order.expectedPrice.toFixed(2)}`);
        } else {
          console.log(`❌ ${order.tier} order failed: ${result.error}`);
        }

      } catch (error) {
        console.log(`❌ ${order.tier} order API error: ${error.message}`);
      }
      
      // Small delay between orders
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('Script error:', error.message);
  }
}

async function makeCheckoutRequest(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/checkout/firearms',
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

submitTierOrders();