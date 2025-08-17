const http = require('http');

// Test SP00735 orders across all tiers using fake card number for testing
async function testAllTiersWithFakeCard() {
  try {
    console.log('🧪 TESTING SP00735 ORDERS WITH FAKE CARD ACROSS ALL TIERS');
    console.log('=' .repeat(70));
    
    const orders = [
      {
        tier: 'Bronze',
        userId: 1,
        email: 'bronze.test@example.com',
        price: 7.00,
        name: 'Bronze TestUser'
      },
      {
        tier: 'Gold',
        userId: 2,
        email: 'gold.test@example.com', 
        price: 6.65,
        name: 'Gold TestUser'
      },
      {
        tier: 'Platinum',
        userId: 3,
        email: 'platinum.test@example.com',
        price: 3.57,
        name: 'Platinum TestUser'
      }
    ];

    for (const order of orders) {
      console.log(`\n💳 ${order.tier.toUpperCase()} TIER TEST ORDER:`);
      console.log(`User: ${order.name} (${order.email})`);
      console.log(`Price: $${order.price.toFixed(2)}`);
      
      const payload = {
        userId: order.userId,
        cartItems: [{
          id: 134157,
          quantity: 1,
          price: order.price,
          name: "GLOCK OEM 8 POUND CONNECTOR",
          manufacturerPartNumber: "SP00735", // Key for Products Module
          sku: "GLSP00735", // Key for Deal Subform 
          requiresFFL: false,
          isFirearm: false
        }],
        shippingAddress: {
          street: "123 Test St",
          city: "Austin",
          state: "TX",
          zipCode: "78701"
        },
        paymentMethod: {
          cardNumber: "4111111111111111", // Authorize.Net test card
          expirationDate: "12/25",
          cvv: "123"
        },
        customerInfo: {
          firstName: order.name.split(' ')[0],
          lastName: order.name.split(' ')[1],
          email: order.email,
          phone: `555-000${order.userId}`
        },
        fflRecipientId: 1414 // BACK ACRE GUN WORKS
      };

      try {
        console.log(`   Submitting ${order.tier} order...`);
        const result = await makeRequest(payload);
        
        if (result.success) {
          console.log(`   ✅ ${order.tier} ORDER SUCCESS:`);
          console.log(`      Order ID: ${result.order?.id}`);
          console.log(`      Order Number: ${result.order?.orderNumber}`);
          console.log(`      Status: ${result.order?.status}`);
          if (result.order?.dealId) {
            console.log(`      Zoho Deal ID: ${result.order.dealId}`);
          }
          
          console.log(`   🔍 ZOHO VALIDATION FOR ${order.tier}:`);
          console.log(`      Products Module: SP00735 (static info)`);
          console.log(`      Deal Subform: GLSP00735 + $${order.price.toFixed(2)}`);
          
        } else {
          console.log(`   ❌ ${order.tier} ORDER FAILED: ${result.error}`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${order.tier} API ERROR: ${error.message}`);
      }
      
      // Delay between orders
      console.log('   Waiting 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('\n🎯 TEST COMPLETE - TIER VALIDATION:');
    console.log('Expected Results:');
    console.log('• Bronze: $7.00 retail pricing');
    console.log('• Gold: $6.65 member discount (5%)');
    console.log('• Platinum: $3.57 wholesale + profit (49% off)');
    console.log('• Single SP00735 entry in Zoho Products Module');
    console.log('• Three separate deals with tier-specific pricing');
    console.log('• Proper field separation enforced');

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

async function makeRequest(payload) {
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
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (e) {
          console.log('Raw response preview:', body.substring(0, 100));
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout after 15 seconds'));
    });

    req.write(data);
    req.end();
  });
}

testAllTiersWithFakeCard();