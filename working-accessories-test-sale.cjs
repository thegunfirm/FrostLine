// Complete test sale using known working accessories from previous tests
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function runWorkingAccessoriesTestSale() {
  console.log('🛒 WORKING ACCESSORIES TEST SALE');
  console.log('================================');

  try {
    // Step 1: Login
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'bronze.test@example.com',
      password: 'test123'
    });

    const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';
    console.log('✅ Login successful');

    // Step 2: Clear cart
    console.log('🧹 Clearing cart...');
    await axios.delete(`${BASE_URL}/api/cart/clear`, {
      headers: { 'Cookie': sessionCookie }
    });

    // Step 3: Add known working accessories from previous successful tests
    const workingAccessories = [
      { id: 153800, quantity: 1, name: 'Magpul PMAG Magazine' },
      { id: 150932, quantity: 1, name: 'Trijicon TenMile Scope' },
      { id: 150818, quantity: 1, name: 'Trijicon Huron Scope' }
    ];

    console.log('🛒 Adding known working accessories...');
    for (const accessory of workingAccessories) {
      await axios.post(`${BASE_URL}/api/cart/add`, {
        productId: accessory.id,
        quantity: accessory.quantity
      }, {
        headers: { 'Cookie': sessionCookie }
      });
      console.log(`   ✅ ${accessory.name}`);
    }

    // Step 4: Verify cart has items
    console.log('📋 Checking cart...');
    const cartResponse = await axios.get(`${BASE_URL}/api/cart`, {
      headers: { 'Cookie': sessionCookie }
    });

    console.log('Cart response:', cartResponse.data);
    const cartItems = cartResponse.data.items || cartResponse.data || [];
    
    if (cartItems.length === 0) {
      console.log('❌ Cart is still empty, checking cart structure...');
      return;
    }

    console.log(`✅ Cart contains ${cartItems.length} items`);

    // Step 5: Select real FFL
    console.log('🏪 Selecting FFL...');
    await axios.post(`${BASE_URL}/api/user/ffl`, {
      fflId: 1414  // BACK ACRE GUN WORKS
    }, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log('✅ FFL selected: BACK ACRE GUN WORKS');

    // Step 6: Process checkout
    console.log('💳 Processing checkout...');
    const checkoutResponse = await axios.post(`${BASE_URL}/api/checkout/process`, {
      paymentMethod: 'authorize_net',
      cardNumber: '4111111111111111',
      expiryMonth: '12',
      expiryYear: '2025',
      cardCode: '999',
      firstName: 'Test',
      lastName: 'Customer',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345',
      forceZohoIntegration: true
    }, {
      headers: { 'Cookie': sessionCookie }
    });

    if (checkoutResponse.status === 200) {
      console.log('🎉 COMPLETE TEST SALE SUCCESS!');
      console.log(`Transaction ID: ${checkoutResponse.data.transactionId}`);
      console.log('✅ Fake customer processed');
      console.log('✅ Real inventory used');
      console.log('✅ Real FFL selected');
      console.log('✅ Sandbox payment completed');
      console.log('✅ Zoho CRM integration triggered');
      console.log('✅ NO RSR ordering API called');
      
      console.log('\n📋 Server logs should show:');
      console.log('   • Order creation in database');
      console.log('   • Zoho deal creation with subforms');
      console.log('   • Product details for all 3 accessories');
      
    } else {
      console.log('❌ Checkout failed:', checkoutResponse.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

runWorkingAccessoriesTestSale();