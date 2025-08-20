/**
 * Test Zoho deal creation with actual cart data to see why subforms aren't working
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
let globalCookie = '';

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': globalCookie,
      ...options.headers
    }
  });
  
  // Extract and preserve session cookie
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    const newCookie = setCookieHeader.split(';')[0];
    globalCookie = newCookie;
  }
  
  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = await response.text();
  }
  
  return { data, response };
}

async function testZohoDealCreation() {
  console.log('🧪 Testing Zoho Deal Creation with Real Cart Data');
  console.log('===========================================');
  
  try {
    // Step 1: Login
    console.log('\n1. Login');
    const loginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'ordertest@example.com',
        password: 'TestPassword123!'
      })
    });
    
    if (!loginResult.data.success) {
      throw new Error('Login failed');
    }
    console.log(`✅ Logged in: ${loginResult.data.firstName} ${loginResult.data.lastName}`);
    
    // Step 2: Add test product to cart
    console.log('\n2. Add test product to cart');
    await makeRequest('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({
        sku: 'PA175S203', // GLOCK 17 GEN5
        quantity: 1
      })
    });
    
    // Step 3: Get cart contents
    console.log('\n3. Get cart contents');
    const cartResult = await makeRequest('/api/cart');
    console.log('Cart items:', cartResult.data.items?.length || 0);
    
    if (!cartResult.data.items || cartResult.data.items.length === 0) {
      throw new Error('No items in cart');
    }
    
    // Step 4: Test manual Zoho deal creation
    console.log('\n4. Test manual Zoho deal creation');
    const zohoTestData = {
      customerEmail: 'ordertest@example.com',
      customerName: 'John OrderTest',
      membershipTier: 'Bronze',
      orderNumber: `TEST-${Date.now()}`,
      totalAmount: cartResult.data.total,
      orderItems: cartResult.data.items.map(item => ({
        productName: item.name,
        sku: item.sku,
        manufacturerPartNumber: item.sku, // Use SKU as manufacturer part number
        quantity: item.quantity,
        unitPrice: item.price,
        fflRequired: item.requiresFFL || false,
        manufacturer: item.manufacturer,
        category: 'Handguns',
        rsrStockNumber: 'GL' + item.sku // Mock RSR stock number format
      })),
      fflRequired: cartResult.data.items.some(item => item.requiresFFL),
      testMode: true
    };
    
    console.log('📋 Zoho test data:', JSON.stringify(zohoTestData, null, 2));
    
    const zohoResult = await makeRequest('/api/test/zoho-deal', {
      method: 'POST',
      body: JSON.stringify(zohoTestData)
    });
    
    console.log('\n5. Zoho Deal Creation Result');
    console.log('Response status:', zohoResult.response.status);
    console.log('Response data:', JSON.stringify(zohoResult.data, null, 2));
    
    if (zohoResult.data.success) {
      console.log(`✅ Deal created successfully: ${zohoResult.data.dealId}`);
      console.log('Check Zoho CRM for deal and subform data');
    } else {
      console.log(`❌ Deal creation failed: ${zohoResult.data.error}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testZohoDealCreation();