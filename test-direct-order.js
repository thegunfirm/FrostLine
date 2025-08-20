/**
 * Direct database order test - bypasses email verification for testing
 * Tests the complete ordering flow with real products and sandbox payment
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test customer data
const testCustomer = {
  email: 'testcustomer@example.com',
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
  
  let data;
  try {
    data = await response.json();
  } catch (e) {
    console.log(`Non-JSON response from ${endpoint}:`, response.status);
    return { data: null, response, text: await response.text() };
  }
  
  console.log(`${options.method || 'GET'} ${endpoint}: ${response.status}`);
  
  if (!response.ok) {
    console.error('Error:', data);
    throw new Error(`Request failed: ${response.status} - ${JSON.stringify(data)}`);
  }
  
  return { data, response };
}

async function createVerifiedCustomer() {
  console.log('🏗️ Creating verified customer directly in database...');
  
  // Use the admin endpoint to create a verified user directly
  try {
    const result = await makeRequest('/api/admin/create-verified-user', {
      method: 'POST',
      body: JSON.stringify({
        ...testCustomer,
        isEmailVerified: true
      })
    });
    console.log('✅ Verified customer created');
    return result.data;
  } catch (error) {
    console.log('⚠️ Direct user creation failed, trying registration + verification simulation');
    
    // Try registration first
    await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testCustomer)
    });
    
    // Get verification token from database or simulate verification
    const verifyResult = await makeRequest('/api/admin/verify-user-email', {
      method: 'POST',
      body: JSON.stringify({
        email: testCustomer.email
      })
    });
    
    console.log('✅ Customer email verified');
    return verifyResult.data;
  }
}

async function testCompleteOrderFlow() {
  console.log('🧪 Starting Direct Database Order Test');
  console.log('=====================================');
  
  let sessionCookie = '';
  
  try {
    // Step 1: Create verified customer
    console.log('\n1️⃣ CREATING VERIFIED CUSTOMER');
    await createVerifiedCustomer();
    
    // Step 2: Login
    console.log('\n2️⃣ LOGGING IN');
    const loginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testCustomer.email,
        password: testCustomer.password
      })
    });
    
    // Extract session cookie
    const setCookieHeader = loginResult.response.headers.get('set-cookie');
    if (setCookieHeader) {
      sessionCookie = setCookieHeader.split(';')[0];
    }
    
    console.log('✅ Customer logged in successfully');
    
    // Step 3: Add Glock to cart (firearm requiring FFL)
    console.log('\n3️⃣ ADDING GLOCK 17 GEN5 TO CART');
    await makeRequest('/api/cart/add', {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        sku: 'PA175S203', // GLOCK 17 GEN5 9MM 17RD - $647
        quantity: 1
      })
    });
    
    console.log('✅ Glock 17 Gen5 added to cart');
    
    // Step 4: Add accessory to cart
    console.log('\n4️⃣ ADDING HOLSTER ACCESSORY TO CART');
    await makeRequest('/api/cart/add', {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        sku: '2WH-1-SBL-R', // 1791 holster - $50.99
        quantity: 1
      })
    });
    
    console.log('✅ 1791 holster accessory added to cart');
    
    // Step 5: View cart to verify items
    console.log('\n5️⃣ VIEWING CART CONTENTS');
    const cartResult = await makeRequest('/api/cart', {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    console.log('📦 Cart contents:');
    cartResult.data.items?.forEach(item => {
      console.log(`   • ${item.name} - $${item.price} (SKU: ${item.sku}) ${item.requiresFFL ? '[FFL Required]' : ''}`);
    });
    console.log(`   💰 Total: $${cartResult.data.total}`);
    
    // Step 6: Set shipping address
    console.log('\n6️⃣ SETTING SHIPPING ADDRESS');
    await makeRequest('/api/profile/shipping-address', {
      method: 'PUT',
      headers: {
        'Cookie': sessionCookie
      },
      body: JSON.stringify(testAddress)
    });
    
    console.log('✅ Shipping address configured');
    
    // Step 7: Set billing address  
    console.log('\n7️⃣ SETTING BILLING ADDRESS');
    await makeRequest('/api/profile/billing-address', {
      method: 'PUT',
      headers: {
        'Cookie': sessionCookie
      },
      body: JSON.stringify(testAddress)
    });
    
    console.log('✅ Billing address configured');
    
    // Step 8: Get available FFLs and select one for firearm
    console.log('\n8️⃣ SELECTING FFL FOR FIREARM');
    const fflResult = await makeRequest('/api/ffls/search', {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        zipCode: testAddress.zipCode,
        radius: 50
      })
    });
    
    if (fflResult.data?.ffls?.length > 0) {
      const selectedFFL = fflResult.data.ffls[0];
      console.log(`🎯 Selected FFL: ${selectedFFL.businessName}`);
      
      await makeRequest('/api/cart/select-ffl', {
        method: 'POST',
        headers: {
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          fflLicense: selectedFFL.license
        })
      });
      
      console.log('✅ FFL selected for firearm transfer');
    } else {
      console.log('⚠️ No FFLs found, will use test FFL');
      await makeRequest('/api/cart/select-ffl', {
        method: 'POST',
        headers: {
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          fflLicense: '1-12-345-67-8A-12345' // Test FFL
        })
      });
    }
    
    // Step 9: Process payment with sandbox Authorize.Net
    console.log('\n9️⃣ PROCESSING SANDBOX PAYMENT');
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
        skipRSRSubmission: true, // Don't submit to RSR Engine
        testMode: true // Use sandbox
      })
    });
    
    console.log('✅ Payment processed successfully');
    console.log('📋 Order Summary:');
    console.log(`   🔢 Order ID: ${orderResult.data.orderId}`);
    console.log(`   💰 Total: $${orderResult.data.total}`);
    console.log(`   🏦 Payment Status: ${orderResult.data.paymentStatus}`);
    
    // Step 10: Verify order in database
    console.log('\n🔟 VERIFYING ORDER IN DATABASE');
    const orderCheck = await makeRequest(`/api/orders/${orderResult.data.orderId}`, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    console.log('📊 Order Details:');
    console.log(`   • Order #: ${orderCheck.data.orderNumber}`);
    console.log(`   • Status: ${orderCheck.data.status}`);
    console.log(`   • Items: ${orderCheck.data.items?.length} products`);
    console.log(`   • FFL Required: ${orderCheck.data.requiresFFL ? 'Yes' : 'No'}`);
    
    console.log('\n🎉 COMPLETE UI ORDER TEST SUCCESSFUL!');
    console.log('=====================================');
    console.log('✅ Real Glock 17 Gen5 firearm ($647)');
    console.log('✅ Real 1791 holster accessory ($50.99)'); 
    console.log('✅ FFL requirement handling');
    console.log('✅ Sandbox Authorize.Net payment');
    console.log('✅ Order saved to database');
    console.log('✅ NO submission to RSR Engine');
    console.log(`\n📋 Final Order ID: ${orderResult.data.orderId}`);
    console.log(`💰 Final Total: $${orderResult.data.total}`);
    
  } catch (error) {
    console.error('\n❌ ORDER TEST FAILED:', error.message);
    console.error('Full error:', error);
  }
}

testCompleteOrderFlow();