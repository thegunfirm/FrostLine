// Debug the actual checkout service issue
const http = require('http');

async function debugCheckout() {
  console.log('🔧 DEBUGGING CHECKOUT SERVICE TIMEOUT');
  
  // First test a simple health check
  console.log('1. Testing health endpoint...');
  const healthResult = await makeSimpleRequest('/api/health');
  console.log('Health check result:', healthResult);
  
  // Test firearms compliance config endpoint
  console.log('2. Testing compliance config...');
  const configResult = await makeSimpleRequest('/api/firearms-compliance/config');
  console.log('Config result:', configResult);
  
  // Test a simple compliance check (not checkout)
  console.log('3. Testing compliance check...');
  const compliancePayload = {
    userId: 1,
    cartItems: [{
      id: 134157,
      quantity: 1,
      price: 7.00,
      isFirearm: false,
      requiresFFL: false
    }]
  };
  
  const complianceResult = await makePostRequest('/api/firearms-compliance/check', compliancePayload);
  console.log('Compliance check result:', complianceResult);
  
  console.log('4. Now testing full checkout (with timeout tracking)...');
  const startTime = Date.now();
  
  const checkoutPayload = {
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
  
  const checkoutResult = await makePostRequest('/api/firearms-compliance/checkout', checkoutPayload, 15000);
  const endTime = Date.now();
  
  console.log(`Checkout completed in ${endTime - startTime}ms`);
  console.log('Checkout result:', checkoutResult);
}

async function makeSimpleRequest(path) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET'
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ error: 'Parse error', body: body.substring(0, 100) });
        }
      });
    });
    
    req.on('error', (error) => resolve({ error: error.message }));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ error: 'Timeout after 5 seconds' });
    });
    req.end();
  });
}

async function makePostRequest(path, payload, timeout = 10000) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ error: 'Parse error', body: body.substring(0, 100) });
        }
      });
    });
    
    req.on('error', (error) => resolve({ error: error.message }));
    req.setTimeout(timeout, () => {
      req.destroy();
      resolve({ error: `Timeout after ${timeout}ms` });
    });
    
    req.write(data);
    req.end();
  });
}

debugCheckout().catch(console.error);