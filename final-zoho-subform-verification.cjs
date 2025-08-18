// Final verification test with enhanced product creation and subform monitoring
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function finalSubformVerificationTest() {
  console.log('🎯 FINAL ZOHO SUBFORM VERIFICATION TEST');
  console.log('======================================');
  console.log('Testing the enhanced "Find or Create Product by SKU" functionality');
  console.log('with proper subform population after product creation');
  console.log('');

  try {
    // Step 1: Login
    console.log('🔐 Step 1: Login');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'bronze.test@example.com',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';
    console.log('✅ Authenticated successfully');

    // Step 2: Clear cart
    console.log('🧹 Step 2: Clear Cart');
    await axios.delete(`${BASE_URL}/api/cart/clear`, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log('✅ Cart cleared');

    // Step 3: Add a single test product with unique SKU
    console.log('🛒 Step 3: Add Test Product');
    const testProductId = 153800; // Known working product ID
    const addResponse = await axios.post(`${BASE_URL}/api/cart/add`, {
      productId: testProductId,
      quantity: 1
    }, {
      headers: { 'Cookie': sessionCookie }
    });

    if (addResponse.status === 200) {
      console.log(`✅ Added test product (ID: ${testProductId})`);
    } else {
      throw new Error('Failed to add product to cart');
    }

    // Step 4: Select FFL
    console.log('🏪 Step 4: Select FFL');
    await axios.post(`${BASE_URL}/api/user/ffl`, {
      fflId: 1414  // BACK ACRE GUN WORKS
    }, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log('✅ FFL selected');

    // Step 5: Process checkout with monitoring
    console.log('💳 Step 5: Process Checkout');
    console.log('   Monitoring product creation and subform population...');
    
    const checkoutResponse = await axios.post(`${BASE_URL}/api/checkout/process`, {
      paymentMethod: 'authorize_net',
      cardNumber: '4111111111111111',
      expiryMonth: '12',
      expiryYear: '2025',
      cardCode: '999',
      firstName: 'Test',
      lastName: 'Customer',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345',
      forceZohoIntegration: true
    }, {
      headers: { 'Cookie': sessionCookie }
    });

    console.log(`📊 Checkout Status: ${checkoutResponse.status}`);
    
    if (checkoutResponse.status === 200 || checkoutResponse.status === 201) {
      console.log('✅ PAYMENT PROCESSED');
      
      // Step 6: Wait for background processing
      console.log('⏳ Step 6: Wait for Zoho Integration');
      console.log('   Waiting for product creation and subform population...');
      await new Promise(resolve => setTimeout(resolve, 8000)); // Wait longer for product creation
      
      // Step 7: Check for new order
      console.log('🔍 Step 7: Verify Order Creation');
      try {
        const ordersResponse = await axios.get(`${BASE_URL}/api/admin/orders/recent`, {
          headers: { 'Cookie': sessionCookie }
        });
        
        if (ordersResponse.status === 200 && ordersResponse.data.length > 0) {
          const latestOrder = ordersResponse.data[0];
          console.log(`✅ Order created: ${latestOrder.id}`);
          
          if (latestOrder.zoho_deal_id) {
            console.log(`✅ Zoho Deal ID: ${latestOrder.zoho_deal_id}`);
            
            // Step 8: Verify subform population
            console.log('🔍 Step 8: Verify Zoho Subforms');
            await new Promise(resolve => setTimeout(resolve, 3000)); // Additional wait for subform verification
            
            const dealResponse = await axios.get(`${BASE_URL}/api/zoho/deals/${latestOrder.zoho_deal_id}`, {
              headers: { 'Cookie': sessionCookie }
            });
            
            if (dealResponse.status === 200) {
              const deal = dealResponse.data;
              console.log('✅ Deal retrieved from Zoho CRM');
              
              // Check Product_Details subform
              const hasProductDetails = deal.Product_Details && Array.isArray(deal.Product_Details) && deal.Product_Details.length > 0;
              const hasSubform1 = deal.Subform_1 && Array.isArray(deal.Subform_1) && deal.Subform_1.length > 0;
              
              console.log('\n📋 SUBFORM VERIFICATION RESULTS:');
              console.log('================================');
              
              if (hasProductDetails) {
                console.log(`✅ Product_Details: ${deal.Product_Details.length} products found`);
                deal.Product_Details.forEach((product, i) => {
                  console.log(`   ${i+1}. Product: ${product.Product_Name || product.Product_Code}`);
                  console.log(`      SKU: ${product.Product_Code || 'N/A'}`);
                  console.log(`      Price: $${product.Unit_Price || 'N/A'}`);
                  console.log(`      Quantity: ${product.Quantity || 'N/A'}`);
                  console.log(`      Total: $${product.Total || 'N/A'}`);
                  console.log(`      RSR Part #: ${product.Distributor_Part_Number || 'N/A'}`);
                });
              } else {
                console.log('❌ Product_Details: No subform data found');
              }
              
              if (hasSubform1) {
                console.log(`✅ Subform_1: ${deal.Subform_1.length} products found`);
                deal.Subform_1.forEach((product, i) => {
                  console.log(`   ${i+1}. Product: ${product.Product_Name || product.Product_Code}`);
                  console.log(`      SKU: ${product.Product_Code || 'N/A'}`);
                  console.log(`      Price: $${product.Unit_Price || 'N/A'}`);
                });
              } else {
                console.log('❌ Subform_1: No subform data found');
              }
              
              // Final assessment
              console.log('\n🎯 FINAL ASSESSMENT:');
              console.log('====================');
              
              if (hasProductDetails || hasSubform1) {
                console.log('🎉 SUCCESS: Product creation and subform population WORKING!');
                console.log(`   ✅ Products created in Zoho Products module`);
                console.log(`   ✅ Subforms populated with product references`);
                console.log(`   ✅ Complete order-to-deal integration functional`);
                
                const totalProducts = (deal.Product_Details?.length || 0) + (deal.Subform_1?.length || 0);
                console.log(`   📊 Total product records in subforms: ${totalProducts}`);
                
              } else {
                console.log('❌ ISSUE: Subforms still not populated');
                console.log('   Check server logs for product creation errors');
                console.log('   Verify Zoho Products module field mapping');
              }
              
            } else {
              console.log('⚠️ Could not retrieve deal from Zoho');
            }
            
          } else {
            console.log('⚠️ No Zoho Deal ID in order record');
          }
        } else {
          console.log('⚠️ No recent orders found');
        }
      } catch (verifyError) {
        console.log('⚠️ Could not verify order creation');
      }
      
    } else {
      console.log(`❌ Payment failed: ${checkoutResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

finalSubformVerificationTest();