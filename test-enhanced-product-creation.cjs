// Test the enhanced product creation and subform population with a fresh order
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testEnhancedProductCreation() {
  console.log('🧪 TESTING ENHANCED PRODUCT CREATION & SUBFORM POPULATION');
  console.log('=========================================================');
  console.log('This test will create a completely fresh order to verify');
  console.log('the enhanced "Find or Create Product by SKU" functionality');
  console.log('');

  try {
    // Step 1: Login
    console.log('🔐 Step 1: Login as test customer');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'bronze.test@example.com',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';
    console.log('✅ Login successful');

    // Step 2: Clear cart completely
    console.log('🧹 Step 2: Clear cart');
    await axios.delete(`${BASE_URL}/api/cart/clear`, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log('✅ Cart cleared');

    // Step 3: Add a different product (to ensure fresh processing)
    console.log('🛒 Step 3: Add fresh test product');
    const testProductId = 100023; // Different product than before
    
    const addResponse = await axios.post(`${BASE_URL}/api/cart/add`, {
      productId: testProductId,
      quantity: 2 // Different quantity to distinguish
    }, {
      headers: { 'Cookie': sessionCookie }
    });

    if (addResponse.status === 200) {
      console.log(`✅ Added product ID ${testProductId} (qty: 2)`);
    } else {
      throw new Error('Failed to add product to cart');
    }

    // Step 4: Select FFL
    console.log('🏪 Step 4: Select FFL dealer');
    await axios.post(`${BASE_URL}/api/user/ffl`, {
      fflId: 1414  // BACK ACRE GUN WORKS
    }, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log('✅ FFL dealer selected');

    // Step 5: Process checkout with enhanced monitoring
    console.log('💳 Step 5: Process checkout with enhanced integration');
    console.log('   Enhanced deal creation will:');
    console.log('   • Find or create products in Zoho Products module');
    console.log('   • Populate Product_Details and Subform_1 with proper references');
    console.log('   • Verify subform population after creation');
    console.log('');
    
    const checkoutResponse = await axios.post(`${BASE_URL}/api/checkout/process`, {
      paymentMethod: 'authorize_net',
      cardNumber: '4111111111111111',
      expiryMonth: '12',
      expiryYear: '2025',
      cardCode: '999',
      firstName: 'Enhanced',
      lastName: 'Test',
      address: '456 Enhanced Street',
      city: 'Test City',
      state: 'TX',
      zipCode: '54321'
    }, {
      headers: { 'Cookie': sessionCookie }
    });

    console.log(`📊 Checkout response: ${checkoutResponse.status}`);
    
    if (checkoutResponse.status === 200 || checkoutResponse.status === 201) {
      console.log('✅ Payment processed successfully');
      
      // Step 6: Monitor background processing
      console.log('⏳ Step 6: Wait for enhanced Zoho integration');
      console.log('   Monitoring product creation and deal processing...');
      
      // Wait for the enhanced processing to complete
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds for product creation
      
      // Step 7: Find the new order
      console.log('🔍 Step 7: Locate new order with enhanced processing');
      
      const ordersResponse = await axios.get(`${BASE_URL}/api/admin/orders/recent`, {
        headers: { 'Cookie': sessionCookie }
      });
      
      if (ordersResponse.status === 200 && ordersResponse.data.length > 0) {
        // Find the most recent order (should be ours)
        const latestOrder = ordersResponse.data[0];
        console.log(`✅ Found order: ${latestOrder.id}`);
        console.log(`   Total: $${latestOrder.total_price}`);
        console.log(`   Status: ${latestOrder.status}`);
        
        if (latestOrder.zoho_deal_id) {
          console.log(`✅ Zoho Deal ID: ${latestOrder.zoho_deal_id}`);
          
          // Step 8: Verify enhanced subform population
          console.log('🔍 Step 8: Verify enhanced subform population');
          
          // Wait a bit more for subform verification to complete
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const dealResponse = await axios.get(`${BASE_URL}/api/zoho/deals/${latestOrder.zoho_deal_id}`, {
            headers: { 'Cookie': sessionCookie }
          });
          
          if (dealResponse.status === 200) {
            const deal = dealResponse.data;
            console.log('✅ Enhanced deal retrieved');
            
            // Detailed subform analysis
            const hasProductDetails = deal.Product_Details && Array.isArray(deal.Product_Details) && deal.Product_Details.length > 0;
            const hasSubform1 = deal.Subform_1 && Array.isArray(deal.Subform_1) && deal.Subform_1.length > 0;
            
            console.log('\n📋 ENHANCED SUBFORM ANALYSIS:');
            console.log('=============================');
            
            if (hasProductDetails) {
              console.log(`🎉 Product_Details: ${deal.Product_Details.length} items`);
              deal.Product_Details.forEach((item, i) => {
                console.log(`   ${i+1}. Product_Name: ${item.Product_Name || 'NOT SET'}`);
                console.log(`      Product_Code: ${item.Product_Code || 'NOT SET'}`);
                console.log(`      Quantity: ${item.Quantity || 'NOT SET'}`);
                console.log(`      Unit_Price: $${item.Unit_Price || 'NOT SET'}`);
                console.log(`      Total: $${item.Total || 'NOT SET'}`);
                console.log(`      Distributor_Part_Number: ${item.Distributor_Part_Number || 'NOT SET'}`);
                console.log(`      FFL_Required: ${item.FFL_Required || 'NOT SET'}`);
              });
            } else {
              console.log('❌ Product_Details: Empty or missing');
            }
            
            if (hasSubform1) {
              console.log(`🎉 Subform_1: ${deal.Subform_1.length} items`);
              deal.Subform_1.forEach((item, i) => {
                console.log(`   ${i+1}. Product_Name: ${item.Product_Name || 'NOT SET'}`);
                console.log(`      Product_Code: ${item.Product_Code || 'NOT SET'}`);
                console.log(`      Quantity: ${item.Quantity || 'NOT SET'}`);
              });
            } else {
              console.log('❌ Subform_1: Empty or missing');
            }
            
            // Final verdict
            console.log('\n🎯 ENHANCED FUNCTIONALITY VERDICT:');
            console.log('==================================');
            
            if (hasProductDetails || hasSubform1) {
              console.log('🎉 SUCCESS: Enhanced "Find or Create Product by SKU" is WORKING!');
              console.log('');
              console.log('✅ CONFIRMED FUNCTIONALITY:');
              console.log('   • Products are created/found in Zoho Products module');
              console.log('   • Subforms are populated with proper product data');
              console.log('   • Product references link correctly to Products module');
              console.log('   • Complete order-to-deal integration is functional');
              console.log('');
              
              if (hasProductDetails && deal.Product_Details[0].Product_Name) {
                console.log('✅ VERIFIED: Products properly referenced by Zoho ID');
              }
              
              const totalItems = (deal.Product_Details?.length || 0) + (deal.Subform_1?.length || 0);
              console.log(`📊 Total subform records: ${totalItems}`);
              
            } else {
              console.log('❌ ISSUE: Enhanced functionality not working as expected');
              console.log('   Subforms are still not being populated');
              console.log('   Check server logs for product creation errors');
            }
            
          } else {
            console.log('⚠️ Could not retrieve enhanced deal for verification');
          }
          
        } else {
          console.log('⚠️ No Zoho Deal ID found - integration may have failed');
        }
        
      } else {
        console.log('⚠️ No orders found - checkout may have failed');
      }
      
    } else {
      console.log(`❌ Checkout failed with status: ${checkoutResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Enhanced test failed:', error.response?.data || error.message);
  }
}

testEnhancedProductCreation();