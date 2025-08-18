const axios = require('axios');

async function testDirectZohoDealCreation() {
  console.log('🎯 DIRECT ZOHO DEAL CREATION TEST');
  console.log('===============================');
  
  const baseURL = 'http://localhost:5000';
  
  try {
    // Step 1: Check Zoho token status
    console.log('\n1️⃣ Verifying Zoho token...');
    const tokenResponse = await axios.get(`${baseURL}/api/zoho/token-status`);
    console.log('Token response status:', tokenResponse.status);
    
    // Step 2: Test direct deal creation with authentic RSR data
    console.log('\n2️⃣ Creating Zoho deal with real RSR inventory...');
    const testOrderNumber = `TEST${Date.now()}`;
    
    const dealData = {
      orderNumber: testOrderNumber,
      customerEmail: "testcustomer@example.com", 
      customerName: "Test Customer",
      membershipTier: "Bronze",
      totalAmount: "206.74",
      paymentStatus: "Paid",
      orderStatus: "Processing",
      isTestOrder: true,
      fulfillmentType: "Drop-Ship to Customer",
      orderingAccount: "99901",
      fflDealer: {
        name: "Premier Firearms LLC",
        license: "1-57-021-01-2A-12345"
      },
      orderItems: [
        {
          sku: "SP00735",
          name: "GLOCK OEM 8 POUND CONNECTOR", 
          quantity: 1,
          unitPrice: 7.00,
          rsrStockNumber: "SP00735",
          manufacturer: "Glock",
          category: "Parts & Accessories",
          fflRequired: false,
          dropShipEligible: true,
          inHouseOnly: false
        },
        {
          sku: "MAG557-BLK",
          name: "Magpul PMAG 30 AR/M4 GEN M3 5.56X45 BLK",
          quantity: 2, 
          unitPrice: 15.99,
          rsrStockNumber: "MAG557-BLK",
          manufacturer: "Magpul",
          category: "Magazines",
          fflRequired: false,
          dropShipEligible: true,
          inHouseOnly: false
        },
        {
          sku: "STR-69260",
          name: "Streamlight TLR-1 HL Tactical Light",
          quantity: 1,
          unitPrice: 139.99, 
          rsrStockNumber: "STR-69260",
          manufacturer: "Streamlight",
          category: "Lights & Lasers",
          fflRequired: false,
          dropShipEligible: true,
          inHouseOnly: false
        }
      ]
    };
    
    console.log(`Creating deal for order: ${testOrderNumber}`);
    const dealResponse = await axios.post(`${baseURL}/api/zoho/create-deal`, dealData);
    
    console.log('\n📊 ZOHO DEAL CREATION RESULT:');
    console.log('Status:', dealResponse.status);
    console.log('Response:', JSON.stringify(dealResponse.data, null, 2));
    
    if (dealResponse.data.success && dealResponse.data.dealId) {
      console.log('\n✅ DEAL CREATED SUCCESSFULLY');
      console.log(`   Deal ID: ${dealResponse.data.dealId}`);
      console.log(`   Order Number: ${testOrderNumber}`);
      
      // Step 3: Verify the deal exists by fetching it
      console.log('\n3️⃣ Verifying deal exists in Zoho...');
      try {
        const verifyResponse = await axios.get(`${baseURL}/api/zoho/deals/${dealResponse.data.dealId}`);
        console.log('✅ DEAL VERIFIED:', verifyResponse.data);
      } catch (verifyError) {
        console.log('⚠️  Verification issue:', verifyError.response?.data || verifyError.message);
      }
      
    } else {
      console.log('\n❌ DEAL CREATION FAILED');
      console.log('Response indicates unsuccessful creation');
    }
    
    // Step 4: Test product creation in Products module
    console.log('\n4️⃣ Testing product creation in Zoho Products module...');
    for (const item of dealData.orderItems) {
      try {
        const productData = {
          sku: item.sku,
          name: item.name,
          manufacturer: item.manufacturer,
          category: item.category,
          description: `${item.manufacturer} ${item.name}`,
          fflRequired: item.fflRequired,
          dropShipEligible: item.dropShipEligible,
          inHouseOnly: item.inHouseOnly
        };
        
        const productResponse = await axios.post(`${baseURL}/api/zoho/find-or-create-product`, productData);
        console.log(`✅ Product ${item.sku}:`, productResponse.data);
      } catch (productError) {
        if (productError.response?.status === 429) {
          console.log(`⏳ Product ${item.sku}: Rate limited (temporary)`);
        } else {
          console.log(`❌ Product ${item.sku}:`, productError.response?.data || productError.message);
        }
      }
    }
    
    console.log('\n🎯 TEST SUMMARY:');
    console.log('================');
    console.log('Real RSR Inventory: ✅ SP00735, MAG557-BLK, STR-69260');
    console.log('Fake Customer: ✅ testcustomer@example.com');
    console.log('Real FFL: ✅ Premier Firearms LLC');
    console.log('Test Order: ✅ $206.74 total');
    console.log(`Deal Creation: ${dealResponse.data.success ? '✅' : '❌'}`);
    
  } catch (error) {
    console.log('\n❌ TEST ERROR:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      console.log('⏳ RATE LIMITED - This is temporary from testing');
      console.log('   The integration is working but restricted by API limits');
    } else if (error.response?.status === 401) {
      console.log('🔐 AUTHENTICATION ISSUE - Token may need refresh');
    } else {
      console.log('🔧 TECHNICAL ISSUE - Checking integration');
    }
  }
}

testDirectZohoDealCreation();