/**
 * Test the existing admin Zoho endpoint to see why subforms aren't working
 */

const axios = require('axios');

async function testExistingZohoEndpoint() {
  console.log('🧪 Testing Existing Zoho Deal Creation Endpoint');
  console.log('===============================================');
  
  try {
    // Test data using the existing admin endpoint structure
    const testData = {
      dealName: `Test-Deal-${Date.now()}`,
      contactEmail: 'ordertest@example.com',
      contactFirstName: 'John',
      contactLastName: 'OrderTest',
      stage: 'Order Received',
      amount: 647.00,
      orderNumber: `TEST-${Date.now()}`,
      membershipTier: 'Bronze',
      fflRequired: true,
      fflDealerName: 'Test FFL Dealer',
      orderStatus: 'Processing',
      products: [{
        productName: 'GLOCK 17 GEN5 9MM 4.49" BBL 17RDS FS',
        sku: 'PA175S203',
        manufacturerPartNumber: 'PA175S203',
        rsrStockNumber: 'GLPA175S203',
        upcCode: '764503037108', // Correct RSR UPC for GLOCK PA175S203
        quantity: 1,
        unitPrice: 647.00,
        price: 647.00,
        fflRequired: true,
        dropShipEligible: true,
        category: 'Handguns',
        manufacturer: 'GLOCK'
      }]
    };
    
    console.log('📋 Test data for admin endpoint:');
    console.log(JSON.stringify(testData, null, 2));
    
    console.log('\n🔄 Calling admin/zoho/deals/create-complete...');
    const response = await axios.post(
      'http://localhost:5000/api/admin/zoho/deals/create-complete',
      testData,
      { timeout: 30000 }
    );
    
    console.log('\n📥 Response from deal creation:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.dealId) {
      console.log(`\n✅ Deal created successfully: ${response.data.dealId}`);
      
      // Now retrieve the deal to check if subforms were created
      console.log('\n🔍 Retrieving created deal to check subforms...');
      const dealResponse = await axios.get(
        `http://localhost:5000/api/admin/zoho/deals/${response.data.dealId}`
      );
      
      console.log('\n📊 Deal Details:');
      console.log(JSON.stringify(dealResponse.data, null, 2));
      
      if (dealResponse.data.success) {
        const deal = dealResponse.data.deal;
        
        // Check for subform data
        console.log('\n🔍 Checking for subform data...');
        if (deal.Subform_1 && deal.Subform_1.length > 0) {
          console.log(`✅ SUBFORM FOUND: ${deal.Subform_1.length} items`);
          deal.Subform_1.forEach((item, index) => {
            console.log(`   Item ${index + 1}:`);
            console.log(`      Product_Name: ${item.Product_Name || 'N/A'}`);
            console.log(`      Product_Code: ${item.Product_Code || 'N/A'}`);
            console.log(`      Quantity: ${item.Quantity || 'N/A'}`);
            console.log(`      Unit_Price: ${item.Unit_Price || 'N/A'}`);
          });
        } else {
          console.log('❌ NO SUBFORM DATA FOUND');
          console.log('   This confirms the subform creation is failing');
        }
        
        // Check for other product-related fields
        console.log('\n🔍 Checking main deal fields...');
        console.log(`   Deal_Name: ${deal.Deal_Name || 'N/A'}`);
        console.log(`   Amount: ${deal.Amount || 'N/A'}`);
        console.log(`   Stage: ${deal.Stage || 'N/A'}`);
        console.log(`   Description: ${deal.Description || 'N/A'}`);
        
      } else {
        console.log('❌ Failed to retrieve deal for verification');
      }
      
    } else {
      console.log('❌ Deal creation failed:', response.data.error);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.log('\n📋 Error response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

testExistingZohoEndpoint();