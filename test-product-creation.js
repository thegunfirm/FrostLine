const { ZohoService } = require('./server/zoho-service.ts');
const { ZohoProductLookupService } = require('./server/services/zoho-product-lookup-service.ts');

async function testProductCreation() {
  console.log('🧪 Testing Zoho Product Creation...');
  
  try {
    // Initialize ZohoService with proper configuration
    const zohoService = new ZohoService({
      clientId: process.env.ZOHO_CLIENT_ID,
      clientSecret: process.env.ZOHO_CLIENT_SECRET,
      redirectUri: process.env.ZOHO_REDIRECT_URI,
      accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
      apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com',
      accessToken: process.env.ZOHO_ACCESS_TOKEN,
      refreshToken: process.env.ZOHO_REFRESH_TOKEN
    });
    
    console.log('✅ ZohoService initialized');
    
    // Test the generic createRecord method directly
    console.log('🔍 Testing generic createRecord method...');
    
    const testProductData = {
      Product_Name: 'Test Product Direct Creation',
      Product_Code: 'TEST-DIRECT-CREATE-SKU',
      Manufacturer: 'TEST MANUFACTURER',
      Product_Category: 'Test Category'
    };
    
    console.log('📦 Creating product directly:', testProductData);
    
    const response = await zohoService.createRecord('Products', testProductData);
    
    console.log('✅ Direct product creation response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Error details:', error);
  }
}

// Run the test
testProductCreation();