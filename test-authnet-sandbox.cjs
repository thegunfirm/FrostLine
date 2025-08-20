/**
 * Test Authorize.Net Sandbox Connection
 * Tests basic API connectivity without full transaction
 */

async function testAuthNetSandbox() {
  console.log('🔧 Testing Authorize.Net Sandbox Connection...');
  
  try {
    const response = await fetch('http://localhost:5000/api/test/authnet-ping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testAmount: 1.00,
        cardNumber: '4111111111111111', // Test credit card number
        expirationDate: '1225',
        cvv: '123',
        customerInfo: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        }
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Sandbox Connection Test Results:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Sandbox Connection Failed:');
      console.log('Status:', response.status);
      console.log('Response:', result);
    }
  } catch (error) {
    console.log('❌ Test Error:', error.message);
  }
}

testAuthNetSandbox().then(() => {
  console.log('🏁 Sandbox test complete');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});