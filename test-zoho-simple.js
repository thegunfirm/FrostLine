// Simple Zoho test without OAuth dependency
const axios = require('axios');

async function testZohoSimple() {
  console.log('🧪 ZOHO INTEGRATION TEST');
  console.log('=========================');
  
  try {
    // Test the auth URL endpoint
    console.log('1. Testing OAuth URL generation...');
    const authResponse = await axios.get('http://localhost:5000/api/zoho/auth/url');
    console.log('✅ OAuth URL:', authResponse.data.authUrl ? 'Generated successfully' : 'Failed');
    
    // Test connection status  
    console.log('2. Testing connection status...');
    const statusResponse = await axios.get('http://localhost:5000/api/zoho/status');
    console.log('🔌 Connection status:', statusResponse.data);
    
    // Test customer creation endpoint (this should work without OAuth for testing)
    console.log('3. Testing customer creation endpoint...');
    const testData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@thegunfirm.com',
      phone: '555-1234',
      subscriptionTier: 'Bronze Monthly'
    };
    
    console.log('📋 Creating test customer with data:', testData);
    const createResponse = await axios.post('http://localhost:5000/api/zoho/create-customer', testData);
    console.log('📧 Customer creation response status:', createResponse.status);
    
    if (createResponse.status === 200) {
      console.log('✅ Customer creation endpoint is working');
      console.log('🔑 Next step: Complete OAuth to enable actual Zoho API calls');
      console.log('');
      console.log('🔗 OAuth URL: https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev/api/zoho/auth/initiate');
      console.log('   After OAuth completion, test account will be created in Zoho CRM');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.status, error.response?.statusText || error.message);
  }
}

testZohoSimple();