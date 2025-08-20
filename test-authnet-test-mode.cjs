/**
 * Test Authorize.Net Service Test Mode
 */

async function testAuthorizeNetTestMode() {
  console.log('🧪 Testing Authorize.Net Test Mode');
  
  // Set environment variable for test mode
  process.env.AUTHNET_TEST_MODE = 'true';
  process.env.NODE_ENV = 'development';
  
  try {
    // Test payment data
    const testData = {
      amount: 100.00,
      cardNumber: '4111111111111111',
      expirationDate: '1225',
      cvv: '123',
      customerInfo: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '555-123-4567',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TX',
          zip: '12345'
        }
      }
    };

    console.log('🔄 Testing authCaptureTransaction method...');
    
    const response = await fetch('http://localhost:5000/api/test/authnet-capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Authorize.Net test mode working!');
      console.log('📋 Result:', result);
    } else {
      console.log('❌ Test failed:', result);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testAuthorizeNetTestMode().then(() => {
  console.log('');
  console.log('🏁 AUTHORIZE.NET TEST MODE VERIFICATION COMPLETE');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});