#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function quickCheckoutTest() {
  console.log('🚀 QUICK CHECKOUT TEST');
  console.log('====================');
  
  try {
    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'bronze.test@example.com',
      password: 'securepassword123'
    }, {
      withCredentials: true
    });

    const sessionCookie = loginResponse.headers['set-cookie']?.[0]?.split(';')[0];
    console.log('✅ Login successful');

    // Quick checkout test with minimal payload
    console.log('💳 Testing checkout with simplified payload...');
    
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
          description: 'GLOCK 19 Gen 5 9mm Luger 4.02" Barrel 15-Round',
          name: 'Glock 19 Gen 5'
        }
      ],
      shippingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TX',
        zipCode: '12345'
      },
      paymentMethod: {
        cardNumber: '4111111111111111',
        expirationDate: '1225',
        cvv: '999'
      },
      customerInfo: {
        firstName: 'Test',
        lastName: 'User',
        email: 'bronze.test@example.com',
        phone: '555-1234'
      }
    }, {
      headers: { 'Cookie': sessionCookie },
      timeout: 30000 // 30 second timeout
    });

    console.log('✅ Checkout Response:', checkoutResponse.data);
    
    // Check if order was created
    const ordersResponse = await axios.get(`${BASE_URL}/api/orders`, {
      headers: { 'Cookie': sessionCookie }
    });
    
    console.log(`📊 Total Orders: ${ordersResponse.data.length}`);
    if (ordersResponse.data.length > 0) {
      const latestOrder = ordersResponse.data[ordersResponse.data.length - 1];
      console.log('📝 Latest Order:', {
        id: latestOrder.id,
        status: latestOrder.status,
        totalPrice: latestOrder.totalPrice,
        createdAt: latestOrder.orderDate
      });
    }

  } catch (error) {
    console.error('❌ Checkout Test Failed:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

quickCheckoutTest();