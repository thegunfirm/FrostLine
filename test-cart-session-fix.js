/**
 * Test to verify cart session persistence works correctly
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
    console.log('🍪 Session cookie updated:', newCookie.substring(0, 50) + '...');
  }
  
  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = await response.text();
  }
  
  console.log(`${options.method || 'GET'} ${endpoint}: ${response.status}`);
  return { data, response };
}

async function testCartSessionFlow() {
  console.log('🧪 Testing Cart Session Flow');
  console.log('===========================');
  
  try {
    // Step 1: Login and get session
    console.log('\n1. Login');
    const loginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'ordertest@example.com',
        password: 'TestPassword123!'
      })
    });
    
    if (loginResult.data.success) {
      console.log(`✅ Logged in: ${loginResult.data.firstName} ${loginResult.data.lastName} (${loginResult.data.membershipTier})`);
    } else {
      throw new Error('Login failed');
    }
    
    // Step 2: Add Glock to cart
    console.log('\n2. Add Glock to cart');
    const cartResult = await makeRequest('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({
        sku: 'PA175S203',
        quantity: 1
      })
    });
    
    console.log('Cart add result:', cartResult.data);
    
    // Step 3: Get cart contents
    console.log('\n3. Get cart contents');
    const getCartResult = await makeRequest('/api/cart');
    console.log('Cart contents:', getCartResult.data);
    
    // Step 4: Test session status
    console.log('\n4. Test session status');
    const sessionResult = await makeRequest('/api/auth/user');
    console.log('Session user:', sessionResult.data);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testCartSessionFlow();