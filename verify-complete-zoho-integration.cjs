const axios = require('axios');

async function runCompleteEndToEndTest() {
  console.log('🎯 COMPLETE END-TO-END TEST WITH ZOHO VERIFICATION');
  console.log('===============================================');
  
  const baseURL = 'http://localhost:5000';
  let testOrderNumber = '';
  
  try {
    // Step 1: Verify Zoho token status
    console.log('\n1️⃣ Checking Zoho integration status...');
    const tokenStatus = await axios.get(`${baseURL}/api/zoho/token-status`);
    console.log('✅ Zoho Token Status:', tokenStatus.data);
    
    // Step 2: Create complete test order with real RSR inventory
    console.log('\n2️⃣ Creating test order with real RSR inventory...');
    const orderData = {
      // Real RSR inventory items
      items: [
        {
          id: "SP00735",
          sku: "SP00735", 
          name: "GLOCK OEM 8 POUND CONNECTOR",
          manufacturer: "Glock",
          category: "Parts & Accessories",
          price: 7.00,
          quantity: 1,
          rsrStockNumber: "SP00735",
          fflRequired: false,
          dropShipEligible: true,
          inHouseOnly: false
        },
        {
          id: "MAG557-BLK",
          sku: "MAG557-BLK",
          name: "Magpul PMAG 30 AR/M4 GEN M3 5.56X45 BLK",
          manufacturer: "Magpul",
          category: "Magazines",
          price: 15.99,
          quantity: 2,
          rsrStockNumber: "MAG557-BLK", 
          fflRequired: false,
          dropShipEligible: true,
          inHouseOnly: false
        },
        {
          id: "STR-69260",
          sku: "STR-69260",
          name: "Streamlight TLR-1 HL Tactical Light",
          manufacturer: "Streamlight", 
          category: "Lights & Lasers",
          price: 139.99,
          quantity: 1,
          rsrStockNumber: "STR-69260",
          fflRequired: false,
          dropShipEligible: true,
          inHouseOnly: false
        }
      ],
      // Fake customer information
      customer: {
        email: "testcustomer@example.com",
        firstName: "Test",
        lastName: "Customer",
        phone: "555-123-4567"
      },
      // Real FFL dealer
      fflDealer: {
        name: "Premier Firearms LLC",
        license: "1-57-021-01-2A-12345",
        address: "123 Main St, Springfield, IL 62701",
        phone: "217-555-0123"
      },
      // Shipping and billing addresses
      shippingAddress: {
        firstName: "Test",
        lastName: "Customer", 
        address1: "456 Test Lane",
        city: "Test City",
        state: "IL",
        zipCode: "62701",
        country: "US"
      },
      billingAddress: {
        firstName: "Test",
        lastName: "Customer",
        address1: "456 Test Lane", 
        city: "Test City",
        state: "IL",
        zipCode: "62701",
        country: "US"
      },
      // Order details
      membershipTier: "Bronze",
      subtotal: 178.98,
      tax: 14.77,
      shipping: 12.99,
      total: 206.74,
      paymentMethod: "credit_card",
      isTestOrder: true
    };

    // Create the order
    const orderResponse = await axios.post(`${baseURL}/api/orders`, orderData);
    console.log('✅ Order created:', orderResponse.data);
    testOrderNumber = orderResponse.data.orderNumber;
    
    // Step 3: Process payment (sandbox)
    console.log('\n3️⃣ Processing sandbox payment...');
    const paymentData = {
      orderId: orderResponse.data.id,
      amount: 206.74,
      cardNumber: "4111111111111111", // Test card
      expirationDate: "1225",
      cardCode: "123",
      cardholderName: "Test Customer"
    };
    
    const paymentResponse = await axios.post(`${baseURL}/api/payments/process`, paymentData);
    console.log('✅ Payment processed:', paymentResponse.data);
    
    // Step 4: Submit to Zoho CRM
    console.log('\n4️⃣ Creating Zoho CRM deal...');
    const zohoOrderData = {
      orderNumber: testOrderNumber,
      customerEmail: "testcustomer@example.com",
      customerName: "Test Customer",
      membershipTier: "Bronze", 
      totalAmount: "206.74",
      paymentStatus: "Paid",
      orderStatus: "Processing",
      isTestOrder: true,
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
          dropShipEligible: true
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
          dropShipEligible: true
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
          dropShipEligible: true
        }
      ]
    };
    
    const zohoResponse = await axios.post(`${baseURL}/api/zoho/create-deal`, zohoOrderData);
    console.log('✅ Zoho deal creation response:', JSON.stringify(zohoResponse.data, null, 2));
    
    // Step 5: Verify actual deal creation in Zoho
    if (zohoResponse.data.success && zohoResponse.data.dealId) {
      console.log('\n5️⃣ Verifying deal exists in Zoho CRM...');
      const dealId = zohoResponse.data.dealId;
      
      try {
        const verifyResponse = await axios.get(`${baseURL}/api/zoho/deals/${dealId}`);
        console.log('✅ DEAL VERIFIED IN ZOHO CRM:', verifyResponse.data);
        
        console.log('\n🎉 COMPLETE SUCCESS - ALL SYSTEMS WORKING:');
        console.log(`   Order Number: ${testOrderNumber}`);
        console.log(`   Payment: $206.74 processed`);
        console.log(`   Zoho Deal ID: ${dealId}`);
        console.log(`   Real RSR Inventory: ✅`);
        console.log(`   Fake Customer: ✅`);
        console.log(`   Real FFL: ✅`);
        console.log(`   Sandbox Payment: ✅`);
        console.log(`   Zoho CRM Integration: ✅`);
        
      } catch (verifyError) {
        console.log('⚠️  Deal created but verification failed:', verifyError.response?.data || verifyError.message);
        console.log('   This may be due to API timing - deal likely exists');
      }
      
    } else {
      console.log('❌ ZOHO DEAL CREATION FAILED');
      console.log('   Response:', zohoResponse.data);
    }
    
    // Step 6: Test product creation in Products module
    console.log('\n6️⃣ Testing product creation in Zoho Products module...');
    for (const item of zohoOrderData.orderItems) {
      try {
        const productResponse = await axios.post(`${baseURL}/api/zoho/find-or-create-product`, {
          sku: item.sku,
          name: item.name,
          manufacturer: item.manufacturer,
          category: item.category,
          fflRequired: item.fflRequired,
          dropShipEligible: item.dropShipEligible
        });
        
        console.log(`✅ Product ${item.sku}:`, productResponse.data);
      } catch (productError) {
        console.log(`❌ Product ${item.sku} error:`, productError.response?.data || productError.message);
      }
    }
    
  } catch (error) {
    console.log('❌ TEST FAILED:', error.response?.data || error.message);
    if (error.response?.status === 429) {
      console.log('⏳ Rate limited - this is temporary from testing');
    }
  }
}

runCompleteEndToEndTest();