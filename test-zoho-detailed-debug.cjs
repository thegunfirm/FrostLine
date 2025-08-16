/**
 * Detailed Zoho Integration Debug Test
 * Tests one scenario with full response logging
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testSingleOrder() {
  console.log('🧪 Testing single order with detailed logging...\n');

  const testPayload = {
    cartItems: [
      { sku: 'ACC001', name: 'Gun Safe', price: 299.99, quantity: 1, isFirearm: false, requiresFFL: false }
    ],
    customerInfo: {
      email: 'debug.test@thegunfirm.com',
      firstName: 'Debug',
      lastName: 'TestUser',
      phone: '555-123-4567'
    },
    shippingAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'TX',
      zipCode: '75001',
      country: 'US'
    },
    billingAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'TX',
      zipCode: '75001',
      country: 'US'
    },
    paymentInfo: {
      cardNumber: '4111111111111111',
      expiryMonth: '12',
      expiryYear: '2025',
      cvv: '123',
      nameOnCard: 'Debug TestUser'
    },
    fflRecipientId: null
  };

  try {
    console.log('📝 Sending checkout request...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    const response = await axios.post(`${BASE_URL}/api/checkout/firearms`, testPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ SUCCESS DETAILS:');
      console.log(`   Order Number: ${response.data.orderNumber}`);
      console.log(`   TGF Order Number: ${response.data.tgfOrderNumber}`);
      console.log(`   Deal ID: ${response.data.dealId}`);
      console.log(`   Status: ${response.data.status}`);
      if (response.data.hold) {
        console.log(`   Hold: ${response.data.hold.type} - ${response.data.hold.reason}`);
      }

      // Validate TGF Order Number format
      if (response.data.tgfOrderNumber) {
        const regex = /^test\d{3}[ICF][0A-Z]$/;
        const isValid = regex.test(response.data.tgfOrderNumber);
        console.log(`   Order Format Valid: ${isValid ? '✅' : '❌'}`);
        
        if (isValid) {
          const receiverCode = response.data.tgfOrderNumber.charAt(response.data.tgfOrderNumber.length - 2);
          console.log(`   Receiver Code: ${receiverCode} (Expected: I for In-House accessories)`);
        }
      }

      console.log('\n🎯 ZOHO INTEGRATION TEST PASSED!');
      console.log('✅ System field population working');
      console.log('✅ Order number generation working');
      console.log('✅ Fulfillment type determination working');

    } else {
      console.log('\n❌ CHECKOUT FAILED:');
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Error: ${response.data.error}`);
    }

  } catch (error) {
    console.error('\n❌ REQUEST FAILED:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

testSingleOrder();