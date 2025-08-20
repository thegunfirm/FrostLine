/**
 * Complete UI ordering test with real products
 * Tests the full checkout flow from product selection to payment
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test customer data
const testCustomer = {
  email: 'test.customer@example.com',
  password: 'TestPassword123!',
  firstName: 'John',
  lastName: 'TestCustomer',
  phone: '555-123-4567',
  tier: 'bronze'
};

// Test billing/shipping address
const testAddress = {
  address1: '123 Test Street',
  address2: 'Apt 4B',
  city: 'Test City',
  state: 'TX',
  zipCode: '75001',
  country: 'US'
};

// Test FFL for firearm
const testFFL = {
  license: '1-12-345-67-8A-12345',
  businessName: 'Test Gun Shop',
  address1: '456 Gun Store Ave',
  city: 'Test City',
  state: 'TX',
  zipCode: '75002'
};

// Test payment (sandbox Authorize.Net)
const testPayment = {
  cardNumber: '4111111111111111', // Test Visa
  expirationMonth: '12',
  expirationYear: '2027',
  cvv: '123',
  cardholderName: 'John TestCustomer'
};

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const data = await response.json();
  console.log(`${options.method || 'GET'} ${endpoint}: ${response.status}`);
  
  if (!response.ok) {
    console.error('Error:', data);
    throw new Error(`Request failed: ${response.status}`);
  }
  
  return { data, response };
}

async function testCompleteOrder() {
  console.log('🧪 Starting Complete UI Order Test');
  console.log('=====================================');
  
  let sessionCookie = '';
  
  try {
    // Step 1: Register test customer
    console.log('\n1️⃣ REGISTERING TEST CUSTOMER');
    const registerResult = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testCustomer)
    });
    
    // Extract session cookie if provided
    const setCookieHeader = registerResult.response.headers.get('set-cookie');
    if (setCookieHeader) {
      sessionCookie = setCookieHeader.split(';')[0];
    }
    
    console.log('✅ Customer registered');
    
    // Step 2: Login (if registration didn't auto-login)
    console.log('\n2️⃣ LOGGING IN');
    const loginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        email: testCustomer.email,
        password: testCustomer.password
      })
    });
    
    // Update session cookie
    const loginCookie = loginResult.response.headers.get('set-cookie');
    if (loginCookie) {
      sessionCookie = loginCookie.split(';')[0];
    }
    
    console.log('✅ Customer logged in');
    
    // Step 3: Add Glock to cart
    console.log('\n3️⃣ ADDING GLOCK 17 GEN5 TO CART');
    await makeRequest('/api/cart/add', {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        sku: 'PA175S203', // GLOCK 17 GEN5 9MM 17RD
        quantity: 1
      })
    });
    
    console.log('✅ Glock added to cart');
    
    // Step 4: Add accessory to cart
    console.log('\n4️⃣ ADDING HOLSTER TO CART');
    await makeRequest('/api/cart/add', {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        sku: '2WH-1-SBL-R', // 1791 holster
        quantity: 1
      })
    });
    
    console.log('✅ Holster added to cart');
    
    // Step 5: View cart
    console.log('\n5️⃣ VIEWING CART');
    const cartResult = await makeRequest('/api/cart', {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    console.log('Cart contents:', cartResult.data);
    
    // Step 6: Set shipping address
    console.log('\n6️⃣ SETTING SHIPPING ADDRESS');
    await makeRequest('/api/profile/shipping-address', {
      method: 'PUT',
      headers: {
        'Cookie': sessionCookie
      },
      body: JSON.stringify(testAddress)
    });
    
    console.log('✅ Shipping address set');
    
    // Step 7: Set billing address
    console.log('\n7️⃣ SETTING BILLING ADDRESS');
    await makeRequest('/api/profile/billing-address', {
      method: 'PUT',
      headers: {
        'Cookie': sessionCookie
      },
      body: JSON.stringify(testAddress)
    });
    
    console.log('✅ Billing address set');
    
    // Step 8: Select FFL for firearm
    console.log('\n8️⃣ SELECTING FFL FOR FIREARM');
    await makeRequest('/api/cart/select-ffl', {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        fflLicense: testFFL.license
      })
    });
    
    console.log('✅ FFL selected for firearm');
    
    // Step 9: Process payment (sandbox)
    console.log('\n9️⃣ PROCESSING PAYMENT (SANDBOX)');
    const orderResult = await makeRequest('/api/checkout/process', {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        paymentMethod: {
          type: 'credit_card',
          ...testPayment
        },
        skipRSRSubmission: true // Don't submit to RSR
      })
    });
    
    console.log('✅ Payment processed');
    console.log('Order result:', orderResult.data);
    
    // Step 10: Verify order in database
    console.log('\n🔟 VERIFYING ORDER IN DATABASE');
    const orderCheck = await makeRequest(`/api/orders/${orderResult.data.orderId}`, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    console.log('Order details:', orderCheck.data);
    
    console.log('\n🎉 COMPLETE UI ORDER TEST SUCCESSFUL!');
    console.log('=====================================');
    console.log(`Order ID: ${orderResult.data.orderId}`);
    console.log(`Total: $${orderResult.data.total}`);
    console.log('✅ Glock firearm with FFL requirement');
    console.log('✅ Accessory without FFL requirement');
    console.log('✅ Sandbox payment processing');
    console.log('✅ Order saved to database');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCompleteOrder();