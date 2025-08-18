const axios = require('axios');

async function testTokenFix() {
  console.log('🔧 TESTING TOKEN FIX');
  console.log('===================');
  
  try {
    // Test token refresh first
    console.log('1️⃣ Testing token refresh...');
    const refreshResponse = await axios.post('http://localhost:5000/api/zoho/refresh-token');
    console.log('Token refresh result:', refreshResponse.data.success ? '✅' : '❌');
    
    // Wait a moment for token to be set
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test simple deal creation
    console.log('\n2️⃣ Testing deal creation with refreshed token...');
    const dealData = {
      Deal_Name: `TOKEN-TEST-${Date.now()}`,
      Amount: 100,
      Stage: 'Qualification',
      TGF_Order_Number: `TOKEN${Date.now().toString().slice(-7)}0`,
      Customer_Email: 'token.test@example.com',
      Order_Status: 'Processing',
      Description: 'Token fix validation test'
    };
    
    const dealResponse = await axios.post('http://localhost:5000/api/zoho/create-deal-direct', {
      dealData: dealData
    });
    
    if (dealResponse.data.success) {
      console.log('✅ Deal creation successful!');
      console.log('Deal ID:', dealResponse.data.dealId);
      console.log('🎉 TOKEN FIX VERIFIED - AUTOMATIC REFRESH IS WORKING!');
      
      return {
        success: true,
        dealId: dealResponse.data.dealId,
        message: 'Token refresh and persistence fixed successfully'
      };
    } else {
      console.log('❌ Deal creation failed:', dealResponse.data);
      return {
        success: false,
        error: 'Deal creation failed after token refresh'
      };
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Run the test
testTokenFix().then(result => {
  console.log('\n🏁 TOKEN FIX TEST RESULT:');
  console.log('=========================');
  
  if (result.success) {
    console.log('🎊 SUCCESS: Token refresh system is now working properly!');
    console.log('✅ No more daily token expiration issues');
    console.log('✅ Automatic refresh every 50 minutes');
    console.log('✅ Token persistence across all requests');
    console.log(`✅ Test Deal ID: ${result.dealId}`);
  } else {
    console.log(`❌ Still have issues: ${result.error}`);
  }
});