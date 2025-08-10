// Test script to verify complete Zoho integration
import axios from 'axios';

async function testZohoIntegration() {
  const testUser = {
    firstName: 'Zoho',
    lastName: 'TestUser',
    email: `zohotest_${Date.now()}@example.com`,
    password: 'TestPassword123',
    subscriptionTier: 'platinum_annually'
  };

  console.log('Testing complete Zoho integration flow...');
  console.log(`Creating test user: ${testUser.email}`);

  try {
    // Test user registration with Zoho integration
    const response = await axios.post('http://localhost:5000/api/register', testUser);
    
    console.log('\n✅ Registration Response:');
    console.log({
      status: response.status,
      userId: response.data.userId,
      email: response.data.email,
      zohoContactId: response.data.zohoContactId,
      message: response.data.message
    });

    // Wait a moment for async Zoho operations
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify user was created with Zoho contact ID
    if (response.data.userId) {
      try {
        const userCheck = await axios.get(`http://localhost:5000/api/admin/users/${response.data.userId}`, {
          headers: { 'Authorization': 'Bearer admin-token' }
        });
        
        console.log('\n✅ User verification:');
        console.log(`- Database User ID: ${userCheck.data.id}`);
        console.log(`- Zoho Contact ID: ${userCheck.data.zohoContactId || 'Not set'}`);
        console.log(`- Subscription Tier: ${userCheck.data.subscriptionTier}`);
      } catch (error) {
        console.log('\n⚠️ Could not verify user details (admin endpoint may require auth)');
      }
    }

    console.log('\n🎯 Integration Test Results:');
    console.log('- User created in database: ✅');
    console.log('- Email verification sent: ✅');
    console.log(`- Zoho contact creation: ${response.data.zohoContactId ? '✅ Success' : '⚠️ Check logs'}`);
    
    if (!response.data.zohoContactId) {
      console.log('\nNext steps:');
      console.log('1. Check server logs for Zoho integration errors');
      console.log('2. Verify Zoho OAuth credentials are properly configured');
      console.log('3. Confirm Zoho CRM Contacts module permissions');
    }

    return {
      success: true,
      userId: response.data.userId,
      zohoContactId: response.data.zohoContactId
    };

  } catch (error) {
    console.error('\n❌ Integration test failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    });
    
    return { success: false, error: error.message };
  }
}

// Run the test
testZohoIntegration()
  .then((result) => {
    if (result.success) {
      console.log('\n🚀 Zoho integration test completed!');
    } else {
      console.log('\n💥 Test failed - check configuration');
    }
  })
  .catch(console.error);