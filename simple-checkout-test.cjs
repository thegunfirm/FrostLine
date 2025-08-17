const http = require('http');

// Simple checkout test with minimal payload
async function testSimpleCheckout() {
  console.log('🔧 SIMPLE CHECKOUT API TEST');
  
  const minimalPayload = {
    userId: 1,
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
      firstName: "Bronze",
      lastName: "TestUser",
      email: "bronze.test@example.com"
    }
  };
  
  console.log('Making request to /api/firearms-compliance/checkout...');
  console.log('Payload size:', JSON.stringify(minimalPayload).length, 'bytes');
  
  const data = JSON.stringify(minimalPayload);
  
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

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log('Response status:', res.statusCode);
      console.log('Response headers:', res.headers);
      
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
        console.log('Received chunk of size:', chunk.length);
      });
      
      res.on('end', () => {
        console.log('Response complete. Body length:', body.length);
        console.log('Response body preview:', body.substring(0, 200));
        
        try {
          const result = JSON.parse(body);
          console.log('✅ Parsed JSON response:', result);
          resolve(result);
        } catch (e) {
          console.log('❌ Failed to parse JSON:', e.message);
          resolve({ error: 'Parse error', body: body.substring(0, 500) });
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request error:', error.message);
      resolve({ error: error.message });
    });

    req.setTimeout(10000, () => {
      console.log('⏰ Request timed out after 10 seconds');
      req.destroy();
      resolve({ error: 'Timeout after 10 seconds' });
    });

    console.log('Sending request...');
    req.write(data);
    req.end();
  });
}

testSimpleCheckout().then(result => {
  console.log('\n🎯 Final result:', result);
});