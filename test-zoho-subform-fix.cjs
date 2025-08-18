// Test the Zoho subform fix with a complete order
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testZohoSubformFix() {
  console.log('🔧 TESTING ZOHO SUBFORM FIX');
  console.log('==============================');

  try {
    // Step 1: Login
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'bronze.test@example.com',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';
    console.log('✅ Login successful');

    // Step 2: Clear cart
    console.log('🧹 Clearing cart...');
    await axios.delete(`${BASE_URL}/api/cart/clear`, {
      headers: { 'Cookie': sessionCookie }
    });

    // Step 3: Add test accessories to cart
    const accessories = [
      { id: 153800, quantity: 2, name: 'Magpul PMAG Magazine' },
      { id: 150932, quantity: 1, name: 'Trijicon TenMile Scope' },
      { id: 150818, quantity: 1, name: 'Trijicon Huron Scope' }
    ];

    console.log('🛒 Adding accessories to cart...');
    for (const accessory of accessories) {
      await axios.post(`${BASE_URL}/api/cart/add`, {
        productId: accessory.id,
        quantity: accessory.quantity
      }, {
        headers: { 'Cookie': sessionCookie }
      });
      console.log(`   ✅ ${accessory.name} x${accessory.quantity}`);
    }

    // Step 4: Select FFL
    console.log('🏪 Selecting FFL...');
    await axios.post(`${BASE_URL}/api/user/ffl`, {
      fflId: 1414  // BACK ACRE GUN WORKS
    }, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log('   ✅ Selected: BACK ACRE GUN WORKS');

    // Step 5: Process checkout with force Zoho integration
    console.log('💳 Processing checkout with Zoho integration...');
    const checkoutResponse = await axios.post(`${BASE_URL}/api/checkout/process`, {
      paymentMethod: 'authorize_net',
      cardNumber: '4111111111111111',
      expiryMonth: '12',
      expiryYear: '2025',
      cardCode: '999',
      firstName: 'Bronze',
      lastName: 'TestUser',
      address: '123 Test St',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345',
      forceZohoIntegration: true  // Force Zoho deal creation
    }, {
      headers: { 'Cookie': sessionCookie }
    });

    console.log('📊 Checkout Response:', checkoutResponse.status);
    
    if (checkoutResponse.status === 200) {
      console.log('✅ Checkout completed successfully');
      
      // Wait for Zoho processing
      console.log('⏳ Waiting for Zoho CRM processing...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check for recent deals with our expected subform
      console.log('🔍 Checking for Zoho deal creation...');
      
      // This will be logged in the server console - check server logs for subform verification
      console.log('📋 Check server logs for:');
      console.log('   • "Creating deal with subform data"');
      console.log('   • "SUCCESS: Found X products in subform"');
      console.log('   • Product details for the 3 accessories');
      
      console.log('\n🎯 SUBFORM FIX TEST COMPLETED');
      console.log('Check server console logs to verify that:');
      console.log('1. Deal was created with Product_Details or Subform_1');
      console.log('2. All 3 accessories appear in the subform');
      console.log('3. Product names, SKUs, quantities, and prices are correct');
      
    } else {
      console.log('❌ Checkout failed');
      console.log('Response:', checkoutResponse.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testZohoSubformFix();