/**
 * Test Zoho deal creation to debug why subforms aren't working
 */

const axios = require('axios');

async function testZohoDealCreation() {
  console.log('🧪 Testing Zoho Deal Creation with Debug');
  console.log('========================================');
  
  try {
    // First, let's try to create a deal manually through any existing endpoint
    console.log('🔍 Checking available endpoints...');
    
    // Try the test endpoint that might already exist
    const testData = {
      customerEmail: 'ordertest@example.com',
      customerName: 'John OrderTest Debug',
      membershipTier: 'Bronze',
      orderNumber: `DEBUG-${Date.now()}`,
      totalAmount: 647.00,
      orderItems: [{
        productName: 'GLOCK 17 GEN5 9MM 4.49" BBL 17RDS FS',
        sku: 'PA175S203',
        manufacturerPartNumber: 'PA175S203',
        rsrStockNumber: 'GLPA175S203',
        quantity: 1,
        unitPrice: 647.00,
        fflRequired: true,
        manufacturer: 'GLOCK',
        category: 'Handguns',
        upcCode: '764503913617'
      }],
      isTestOrder: true
    };
    
    console.log('📋 Test data:', JSON.stringify(testData, null, 2));
    
    // Try different possible endpoints
    const endpoints = [
      '/api/test/zoho-deal',
      '/api/zoho/create-deal',
      '/api/zoho/test-deal'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔄 Trying endpoint: ${endpoint}`);
        const response = await axios.post(`http://localhost:5000${endpoint}`, testData, {
          timeout: 30000
        });
        
        console.log(`✅ Success with ${endpoint}:`, response.data);
        
        if (response.data.dealId) {
          console.log(`\n🔍 Now checking the created deal ${response.data.dealId}...`);
          
          // Check the deal that was created
          try {
            const dealResponse = await axios.get(`http://localhost:5000/api/test/zoho-deal/${response.data.dealId}`);
            console.log('\n📊 Created Deal Details:');
            console.log(JSON.stringify(dealResponse.data, null, 2));
          } catch (checkError) {
            console.log('⚠️ Could not retrieve created deal:', checkError.message);
          }
        }
        
        return; // Exit after first successful endpoint
        
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`❌ ${endpoint} not found`);
        } else {
          console.log(`❌ ${endpoint} failed:`, error.response?.data || error.message);
        }
      }
    }
    
    console.log('\n⚠️ No test endpoints worked. The issue might be:');
    console.log('   1. No test endpoint exists for manual deal creation');
    console.log('   2. Authentication is required');
    console.log('   3. Zoho integration is not working');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testZohoDealCreation();