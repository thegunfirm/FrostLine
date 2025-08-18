// Debug the silent failure in checkout order creation
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function debugCheckoutFailure() {
  console.log('🐛 DEBUGGING CHECKOUT SILENT FAILURE');
  console.log('===================================');
  console.log('The checkout returns 200 but no order is created');
  console.log('');

  try {
    // Login and setup
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'bronze.test@example.com',
      password: 'test123'
    });

    const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';
    console.log('✅ Login successful');

    // Clear cart and add product
    await axios.delete(`${BASE_URL}/api/cart/clear`, {
      headers: { 'Cookie': sessionCookie }
    });

    await axios.post(`${BASE_URL}/api/cart/add`, {
      productId: 100027,
      quantity: 1
    }, {
      headers: { 'Cookie': sessionCookie }
    });

    await axios.post(`${BASE_URL}/api/user/ffl`, {
      fflId: 1414
    }, {
      headers: { 'Cookie': sessionCookie }
    });

    console.log('✅ Cart setup completed');

    // Try to see the raw checkout response
    console.log('💳 Attempting checkout with detailed response capture...');
    
    try {
      const checkoutResponse = await axios.post(`${BASE_URL}/api/checkout/process`, {
        userId: 1,
        cartItems: [
          {
            id: 100027,
            productId: 100027,
            quantity: 1,
            price: 499.99,
            isFirearm: true,
            requiresFFL: true,
            sku: 'GLOCK19GEN5',
            description: 'GLOCK 19 Gen 5 9mm Luger 4.02" Barrel 15-Round'
          }
        ],
        shippingAddress: {
          street: '123 Debug Street',
          city: 'Debug City',
          state: 'TX',
          zipCode: '12345'
        },
        paymentMethod: {
          cardNumber: '4111111111111111',
          expirationDate: '1225',
          cvv: '999'
        },
        customerInfo: {
          firstName: 'Debug',
          lastName: 'User',
          email: 'bronze.test@example.com',
          phone: '555-1234'
        },
        fflRecipientId: 1414
      }, {
        headers: { 'Cookie': sessionCookie }
      });

      console.log(`📊 Response Status: ${checkoutResponse.status}`);
      console.log(`📋 Response Headers: ${JSON.stringify(checkoutResponse.headers, null, 2)}`);
      console.log(`📄 Response Data:`, checkoutResponse.data);

      if (checkoutResponse.data && checkoutResponse.data.success === false) {
        console.log('❌ CHECKOUT FAILED WITH ERROR:');
        console.log(`   Error: ${checkoutResponse.data.error || 'No error message'}`);
        console.log(`   Message: ${checkoutResponse.data.message || 'No message'}`);
      } else if (checkoutResponse.data && checkoutResponse.data.success === true) {
        console.log('✅ CHECKOUT REPORTS SUCCESS:');
        console.log(`   Order ID: ${checkoutResponse.data.orderId || 'NOT PROVIDED'}`);
        console.log(`   Order Number: ${checkoutResponse.data.orderNumber || 'NOT PROVIDED'}`);
        console.log(`   Deal ID: ${checkoutResponse.data.dealId || 'NOT PROVIDED'}`);
        console.log(`   Status: ${checkoutResponse.data.status || 'NOT PROVIDED'}`);
        console.log(`   Transaction ID: ${checkoutResponse.data.transactionId || 'NOT PROVIDED'}`);
      } else {
        console.log('⚠️ UNEXPECTED RESPONSE FORMAT:');
        console.log('   Response does not have expected success field');
      }

    } catch (checkoutError) {
      console.error('❌ Checkout request failed:', checkoutError.response?.status, checkoutError.response?.data || checkoutError.message);
    }

    // Wait and check orders again
    console.log('\n⏳ Waiting for potential delayed processing...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    const finalOrderCheck = await axios.get(`${BASE_URL}/api/orders`, {
      headers: { 'Cookie': sessionCookie }
    });

    console.log(`\n📊 Final Order Count: ${finalOrderCheck.data.length}`);
    
    if (finalOrderCheck.data.length > 2) {
      const latestOrder = finalOrderCheck.data[finalOrderCheck.data.length - 1];
      console.log('🎉 NEW ORDER FOUND:');
      console.log(`   ID: ${latestOrder.id}`);
      console.log(`   Status: ${latestOrder.status}`);
      console.log(`   Total: $${latestOrder.totalPrice}`);
      console.log(`   Zoho Deal: ${latestOrder.zohoDealId || 'None'}`);
    } else {
      console.log('❌ Still no new orders created');
      console.log('\n🔍 DEBUGGING CONCLUSIONS:');
      console.log('   1. Checkout endpoint returns 200 status');
      console.log('   2. No error messages are returned');
      console.log('   3. No orders are actually created in database');
      console.log('   4. This suggests a silent failure in the checkout service');
      console.log('   5. Likely an uncaught exception or early return in order creation');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

debugCheckoutFailure();