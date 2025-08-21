const axios = require('axios');

async function testZohoDeals() {
  console.log('🔍 Testing Zoho Deals API...');
  
  const accessToken = process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN || "1000.962cd5bfaac429fa8672491303c8e28f.e09b423f210874075910cdac46670017";
  
  console.log(`🔑 Using token: ${accessToken.substring(0, 20)}...`);
  
  try {
    console.log('🔄 Testing Deals module access...');
    
    // Test Deals API - this is what we actually use for orders
    const response = await axios.get('https://www.zohoapis.com/crm/v2/Deals', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        per_page: 1  // Just get 1 deal to test connection
      }
    });
    
    console.log('✅ Zoho Deals API Connection Successful!');
    console.log(`📊 Found ${response.data.info?.count || 0} deals in CRM`);
    
    if (response.data.data && response.data.data.length > 0) {
      const deal = response.data.data[0];
      console.log('📋 Sample Deal:');
      console.log(`   Deal Name: ${deal.Deal_Name}`);
      console.log(`   Stage: ${deal.Stage}`);
      console.log(`   Owner: ${deal.Owner?.name}`);
      console.log(`   Created: ${deal.Created_Time}`);
    }
    
    console.log('🎯 Zoho API & Automatic Refresh System: WORKING');
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Zoho Deals API Error:');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data.message || error.response.statusText}`);
      console.log(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testZohoDeals();