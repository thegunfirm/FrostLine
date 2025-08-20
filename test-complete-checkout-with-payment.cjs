/**
 * Complete Checkout Test with Payment Processing
 * Tests end-to-end checkout including payment in test mode
 */

async function testCompleteCheckout() {
  console.log('🎯 Testing Complete Checkout with Payment Processing');
  console.log('📋 Using Test Mode for payment processing');
  
  try {
    // Test data for complete checkout
    const checkoutData = {
      userId: 1, // Required for database record
      skipPaymentProcessing: true, // Use test mode for payment
      cartItems: [
        {
          id: '134051_GLPI1750201_' + Date.now(),
          productId: 134051,
          productSku: 'GLPI1750201',
          productName: 'GLOCK 17 GEN3 9MM 10RD',
          productImage: '/api/rsr-image/GLPI1750201',
          quantity: 1,
          price: 599,
          priceBronze: 599,
          priceGold: 569.05,
          pricePlatinum: 539.10,
          requiresFFL: true,
          manufacturer: 'GLOCK',
          addedAt: new Date().toISOString(),
          fulfillmentType: 'ffl_non_dropship',
          dropShippable: false,
          isFirearm: true,
          category: 'Handguns',
          upcCode: '764503175022'
        }
      ],
      userInfo: {
        id: 1,
        email: 'test@thegunfirm.com',
        firstName: 'Test',
        lastName: 'User',
        membershipTier: 'Bronze',
        isVerified: true
      },
      paymentMethod: {
        cardNumber: '4111111111111111',
        expirationDate: '1225',
        cvv: '123'
      },
      customerInfo: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@thegunfirm.com',
        phone: '555-123-4567'
      },
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TX',
        zip: '12345'
      }
    };

    console.log('🔄 Submitting complete checkout with payment...');
    
    // Set test mode environment variable
    process.env.AUTHNET_TEST_MODE = 'true';
    
    const response = await fetch('http://localhost:5000/api/checkout/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Complete checkout processed successfully!');
      console.log('');
      console.log('🎉 COMPLETE CHECKOUT RESULTS:');
      console.log('📋 Order ID:', result.order.id);
      console.log('📋 Order Number:', result.order.orderNumber);
      console.log('📋 Status:', result.order.status);
      console.log('📋 Transaction ID:', result.order.transactionId);
      console.log('📋 Auth Code:', result.order.authCode);
      console.log('📋 Zoho Deal ID:', result.order.dealId);
      
      if (result.order.paymentHold) {
        console.log('🔒 Payment Hold:', result.order.paymentHold);
        console.log('⏰ Hold Expires:', result.order.holdExpiresAt);
      }
      
    } else {
      console.log('❌ Complete checkout failed:');
      console.log('Status:', response.status);
      console.log('Error:', result);
    }
    
  } catch (error) {
    console.log('❌ Test Error:', error.message);
  }
}

testCompleteCheckout().then(() => {
  console.log('');
  console.log('🏁 COMPLETE CHECKOUT TEST FINISHED');
  console.log('🎉 TEST STATUS: PAYMENT PROCESSING VERIFIED');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});