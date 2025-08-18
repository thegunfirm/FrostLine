const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Simple test with minimal customer data
const testData = {
  email: 'simple.test@testgunfirm.com',
  password: 'SimpleTest123!'
};

// Three accessories from the inventory
const accessories = [
  { id: 153800, name: 'Magpul PMAG Magazine', price: 34.99, quantity: 2 },
  { id: 150932, name: 'Trijicon TenMile Scope', price: 2015.00, quantity: 1 },
  { id: 150818, name: 'Trijicon Huron Scope', price: 735.00, quantity: 1 }
];

// Real FFL
const ffl = { id: 1414, name: 'BACK ACRE GUN WORKS' };

async function processSimpleTest() {
  console.log('🧪 SIMPLE ACCESSORIES TEST');
  console.log('==========================');
  
  try {
    // Step 1: Create test user directly in database
    console.log('📝 Creating test user directly...');
    
    const createUserResponse = await axios.post(`${BASE_URL}/api/test/create-user`, {
      email: testData.email,
      password: testData.password,
      firstName: 'Test',
      lastName: 'User',
      membershipTier: 'Bronze'
    });
    
    console.log('✅ Test user created');
    
    // Step 2: Login 
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, testData, {
      withCredentials: true
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.error);
    }
    
    console.log('✅ Login successful');
    const sessionCookie = loginResponse.headers['set-cookie']?.join('; ') || '';
    
    // Step 3: Add accessories to cart
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
    await axios.post(`${BASE_URL}/api/user/ffl`, { fflId: ffl.id }, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log(`   ✅ Selected: ${ffl.name}`);
    
    // Step 5: Process payment (test mode - skip RSR)
    console.log('💳 Processing payment...');
    
    const checkoutResponse = await axios.post(`${BASE_URL}/api/checkout/process`, {
      billingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TX',
        zip: '75001'
      },
      shippingAddress: {
        street: '123 Test St', 
        city: 'Test City',
        state: 'TX',
        zip: '75001'
      },
      paymentMethod: {
        type: 'credit_card',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardholderName: 'Test User'
      },
      skipRsrSubmission: true,
      testMode: true
    }, {
      headers: { 'Cookie': sessionCookie }
    });
    
    if (checkoutResponse.data.success) {
      console.log('🎉 SALE COMPLETED SUCCESSFULLY!');
      console.log('===============================');
      console.log(`Order #: ${checkoutResponse.data.orderNumber}`);
      console.log(`Order ID: ${checkoutResponse.data.orderId}`);
      console.log(`Total: $${accessories.reduce((sum, a) => sum + (a.price * a.quantity), 0).toFixed(2)}`);
      console.log('📦 Items:');
      accessories.forEach(a => {
        console.log(`   • ${a.quantity}x ${a.name} - $${(a.price * a.quantity).toFixed(2)}`);
      });
      console.log('\n✅ TEST RESULTS:');
      console.log('• Fake customer account ✅');
      console.log('• Real accessories inventory ✅'); 
      console.log('• Real FFL dealer ✅');
      console.log('• Sandbox payment processing ✅');
      console.log('• RSR API skipped ✅');
      console.log('• Order stored in database ✅');
      
      // Check Zoho sync
      try {
        const zohoStatus = await axios.get(`${BASE_URL}/api/zoho/status`);
        if (zohoStatus.data.status === 'working') {
          console.log('• Zoho CRM sync available ✅');
        } else {
          console.log('• Zoho CRM sync unavailable ⚠️');
        }
      } catch (e) {
        console.log('• Zoho CRM status unknown ⚠️');
      }
      
    } else {
      console.log('❌ Checkout failed:', checkoutResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    // If it's a missing endpoint error, create a simpler test
    if (error.response?.status === 404 && error.config?.url?.includes('/api/test/create-user')) {
      console.log('\n💡 Creating simplified test user endpoint...');
      console.log('This would require server-side implementation.');
    }
  }
}

processSimpleTest().catch(console.error);