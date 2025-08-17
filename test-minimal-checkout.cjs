// Test with a minimal checkout that skips external API calls
const http = require('http');

async function testMinimalCheckout() {
  console.log('🔧 TESTING MINIMAL CHECKOUT WITHOUT EXTERNAL APIS');
  
  // Create a simple test endpoint first to verify basic functionality
  console.log('1. Testing if we can reach the checkout endpoint at all...');
  
  const minimalPayload = {
    userId: 1,
    cartItems: [{
      id: 134157,
      quantity: 1,
      price: 7.00,
      name: "TEST PRODUCT",
      sku: "TEST123",
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
      cardNumber: "4007000000027",
      expirationDate: "12/25", 
      cvv: "123"
    },
    customerInfo: {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com"
    }
  };
  
  console.log('Submitting minimal checkout...');
  
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const data = JSON.stringify(minimalPayload);
    
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/firearms-compliance/checkout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      console.log(`Response received after ${Date.now() - startTime}ms`);
      console.log('Response status:', res.statusCode);
      
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
        console.log(`Received chunk: ${chunk.length} bytes`);
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        console.log(`Request completed in ${endTime - startTime}ms`);
        console.log('Final response body length:', body.length);
        console.log('Response body preview:', body.substring(0, 500));
        
        try {
          const result = JSON.parse(body);
          console.log('✅ Checkout successful:', result);
          resolve(result);
        } catch (e) {
          console.log('❌ Failed to parse response as JSON');
          resolve({ error: 'Parse error', body });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Request error after ${Date.now() - startTime}ms:`, error.message);
      resolve({ error: error.message });
    });
    
    // Set a longer timeout to see where it gets stuck
    req.setTimeout(20000, () => {
      console.log(`⏰ Request timed out after ${Date.now() - startTime}ms`);
      req.destroy();
      resolve({ error: 'Request timeout after 20 seconds' });
    });
    
    console.log('Writing request data...');
    req.write(data);
    console.log('Request data written, ending request...');
    req.end();
    console.log('Request submitted, waiting for response...');
  });
}

testMinimalCheckout().then(result => {
  console.log('\n🎯 FINAL RESULT:', result);
  
  if (result.error && result.error.includes('timeout')) {
    console.log('\n❌ DIAGNOSIS: The checkout endpoint is hanging/blocking');
    console.log('Likely causes:');
    console.log('- Authorize.Net payment processing is hanging');
    console.log('- Database operation is blocking (insert/update)');
    console.log('- Zoho CRM API call is timing out');
    console.log('- RSR Engine API call is hanging');
    console.log('\nNeed to debug each step individually or add timeouts to external calls');
  } else if (result.success) {
    console.log('\n✅ CHECKOUT IS WORKING!');
    console.log('The tier-based system is functional');
  } else {
    console.log('\n⚠️  CHECKOUT FAILED:', result.error);
    console.log('But at least got a response - issue is in business logic, not timeouts');
  }
}).catch(console.error);