const axios = require('axios');

async function createSimpleDealTest() {
  console.log('🔗 SIMPLE DEAL CREATION TEST');
  console.log('Creating a Zoho deal with current token...');
  
  try {
    // First refresh the token
    console.log('🔄 Refreshing token...');
    const tokenResponse = await axios.post('http://localhost:5000/api/zoho/refresh-token');
    console.log('Token refresh result:', tokenResponse.data.success ? '✅' : '❌');
    
    // Get current token
    const ACCESS_TOKEN = process.env.ZOHO_ACCESS_TOKEN;
    console.log('Token available:', !!ACCESS_TOKEN);
    
    if (!ACCESS_TOKEN) {
      throw new Error('No access token available');
    }
    
    // Create simple deal
    const dealData = {
      Deal_Name: `TEST-DEAL-${Date.now()}`,
      Amount: 189.42,
      Stage: 'Qualification',
      TGF_Order_Number: `TEST${Date.now().toString().slice(-7)}0`,
      Customer_Email: 'test.deal@example.com',
      Order_Status: 'Processing',
      Membership_Tier: 'Bronze',
      Description: 'Simple test deal creation'
    };
    
    console.log('📝 Creating deal:', dealData.Deal_Name);
    
    const response = await axios.post('https://www.zohoapis.com/crm/v2/Deals', {
      data: [dealData]
    }, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.data && response.data.data[0]) {
      const result = response.data.data[0];
      if (result.status === 'success') {
        console.log('✅ Deal created successfully!');
        console.log('Deal ID:', result.details.id);
        console.log('Deal Name:', dealData.Deal_Name);
        
        return {
          success: true,
          dealId: result.details.id,
          dealName: dealData.Deal_Name,
          orderNumber: dealData.TGF_Order_Number
        };
      } else {
        console.log('❌ Deal creation failed:', result);
        return { success: false, error: result };
      }
    } else {
      console.log('❌ Unexpected response:', response.data);
      return { success: false, error: 'Unexpected response format' };
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
}

// Run the test
createSimpleDealTest().then(result => {
  console.log('\n🏁 RESULT:');
  if (result.success) {
    console.log(`✅ Deal ID: ${result.dealId}`);
    console.log(`📋 Deal Name: ${result.dealName}`);
    console.log(`🔢 Order Number: ${result.orderNumber}`);
  } else {
    console.log(`❌ Failed: ${result.error}`);
  }
});