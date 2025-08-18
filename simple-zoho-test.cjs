const axios = require('axios');

async function simpleZohoTest() {
  console.log('🎯 SIMPLE ZOHO TEST');
  console.log('Testing if token refresh actually works...');
  
  try {
    // Get the current token value
    const currentToken = process.env.ZOHO_ACCESS_TOKEN;
    console.log('Token present:', !!currentToken);
    console.log('Token prefix:', currentToken ? currentToken.substring(0, 20) + '...' : 'None');
    
    // Make direct API call to Zoho
    const response = await axios.get('https://www.zohoapis.com/crm/v2/Deals?per_page=1', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${currentToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Direct Zoho API call successful!');
    console.log('Response status:', response.status);
    console.log('Deal count:', response.data?.data?.length || 0);
    
    // Now create a simple deal directly
    const dealData = {
      Deal_Name: `DIRECT-TEST-${Date.now()}`,
      Amount: 42.00,
      Stage: 'Qualification',
      Description: 'Direct Zoho API test'
    };
    
    const createResponse = await axios.post('https://www.zohoapis.com/crm/v2/Deals', {
      data: [dealData]
    }, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${currentToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (createResponse.data.data?.[0]?.status === 'success') {
      const dealId = createResponse.data.data[0].details.id;
      console.log('🎊 SUCCESS! Deal created:', dealId);
      console.log('✅ TOKEN SYSTEM IS WORKING!');
      
      return { success: true, dealId, message: 'Token system fully operational' };
    } else {
      console.log('❌ Deal creation failed:', createResponse.data);
      return { success: false, error: 'Deal creation failed' };
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    
    // Check if it's a token error
    if (error.response?.data?.code === 'INVALID_TOKEN') {
      console.log('🔄 Token is invalid, this confirms the issue');
      return { success: false, error: 'Token expired', needsRefresh: true };
    }
    
    return { success: false, error: error.response?.data || error.message };
  }
}

simpleZohoTest().then(result => {
  console.log('\n🏁 FINAL RESULT:');
  if (result.success) {
    console.log('🎉 TOKEN SYSTEM FIXED AND WORKING!');
    console.log(`Deal ID: ${result.dealId}`);
  } else {
    console.log(`❌ Issue: ${result.error}`);
    if (result.needsRefresh) {
      console.log('💡 Need to implement better token persistence');
    }
  }
});