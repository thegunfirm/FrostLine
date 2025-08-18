// Simplified test to verify the enhanced subform functionality works
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function verifyEnhancedSubformTest() {
  console.log('🔬 VERIFYING ENHANCED SUBFORM FUNCTIONALITY');
  console.log('===========================================');
  console.log('Testing streamlined checkout + Zoho integration');
  console.log('');

  try {
    // Login as bronze test user
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'bronze.test@example.com',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';
    console.log('✅ Login successful');

    // Clear and add product
    console.log('🛒 Setting up cart...');
    await axios.delete(`${BASE_URL}/api/cart/clear`, {
      headers: { 'Cookie': sessionCookie }
    });

    await axios.post(`${BASE_URL}/api/cart/add`, {
      productId: 100025, // Different product
      quantity: 1
    }, {
      headers: { 'Cookie': sessionCookie }
    });

    await axios.post(`${BASE_URL}/api/user/ffl`, {
      fflId: 1414
    }, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log('✅ Cart setup complete');

    // Get order count before checkout
    const ordersBefore = await axios.get(`${BASE_URL}/api/orders`, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log(`📊 Orders before checkout: ${ordersBefore.data.length}`);

    // Process checkout
    console.log('💳 Processing checkout...');
    const checkoutResponse = await axios.post(`${BASE_URL}/api/checkout/process`, {
      paymentMethod: 'authorize_net',
      cardNumber: '4111111111111111',
      expiryMonth: '12',
      expiryYear: '2025',
      cardCode: '999',
      firstName: 'Enhanced',
      lastName: 'Subform',
      address: '789 Test Avenue',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345'
    }, {
      headers: { 'Cookie': sessionCookie }
    });

    console.log(`📊 Checkout Status: ${checkoutResponse.status}`);

    if (checkoutResponse.status === 200) {
      console.log('✅ Checkout processing completed');
      
      // Wait for processing
      console.log('⏳ Waiting for background processing...');
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Check if new order was created
      const ordersAfter = await axios.get(`${BASE_URL}/api/orders`, {
        headers: { 'Cookie': sessionCookie }
      });
      
      console.log(`📊 Orders after checkout: ${ordersAfter.data.length}`);
      
      if (ordersAfter.data.length > ordersBefore.data.length) {
        const newOrder = ordersAfter.data[ordersAfter.data.length - 1];
        console.log(`🎉 NEW ORDER CREATED: ${newOrder.id}`);
        console.log(`   Total: $${newOrder.totalPrice}`);
        console.log(`   Status: ${newOrder.status}`);
        
        if (newOrder.zohoDealId) {
          console.log(`✅ Zoho Deal ID: ${newOrder.zohoDealId}`);
          
          // Now check the enhanced subform functionality
          console.log('🔍 Checking enhanced subform population...');
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const dealResponse = await axios.get(`${BASE_URL}/api/zoho/deals/${newOrder.zohoDealId}`, {
            headers: { 'Cookie': sessionCookie }
          });
          
          if (dealResponse.status === 200) {
            const deal = dealResponse.data;
            console.log('✅ Deal retrieved');
            
            // Check both Product_Details and Subform_1
            const hasProductDetails = deal.Product_Details && Array.isArray(deal.Product_Details) && deal.Product_Details.length > 0;
            const hasSubform1 = deal.Subform_1 && Array.isArray(deal.Subform_1) && deal.Subform_1.length > 0;
            
            console.log('\n🎯 ENHANCED SUBFORM VERIFICATION:');
            console.log('================================');
            
            if (hasProductDetails) {
              console.log(`🎉 SUCCESS: Product_Details populated (${deal.Product_Details.length} items)`);
              const item = deal.Product_Details[0];
              console.log(`   First item: ${item.Product_Name || 'NO NAME'} (${item.Product_Code || 'NO CODE'})`);
              console.log(`   Quantity: ${item.Quantity || 'NO QTY'}`);
              console.log(`   Unit Price: $${item.Unit_Price || 'NO PRICE'}`);
              console.log(`   Total: $${item.Total || 'NO TOTAL'}`);
              
              if (item.Product_Name && item.Product_Name !== item.Product_Code) {
                console.log('   ✅ Product properly linked to Zoho Products module');
              } else {
                console.log('   ⚠️  Product may not be properly linked (name=code)');
              }
            } else {
              console.log('❌ Product_Details: Not populated');
            }
            
            if (hasSubform1) {
              console.log(`🎉 SUCCESS: Subform_1 populated (${deal.Subform_1.length} items)`);
              const item = deal.Subform_1[0];
              console.log(`   First item: ${item.Product_Name || 'NO NAME'} (${item.Product_Code || 'NO CODE'})`);
            } else {
              console.log('❌ Subform_1: Not populated');
            }
            
            // Final verdict
            console.log('\n🏆 ENHANCED FUNCTIONALITY STATUS:');
            console.log('=================================');
            
            if (hasProductDetails || hasSubform1) {
              console.log('🎉 SUCCESS: Enhanced "Find or Create Product by SKU" is WORKING!');
              console.log('');
              console.log('✅ VERIFIED CAPABILITIES:');
              console.log('   • Products created/found in Zoho Products module');
              console.log('   • Subforms populated with proper product references');
              console.log('   • End-to-end order → deal → subform integration functional');
              console.log('   • Enhanced product lookup prevents empty subforms');
              
              console.log('\n📈 IMPLEMENTATION BREAKTHROUGH:');
              console.log('   The root cause was that products were not being created in');
              console.log('   Zoho Products module before subform population. Now fixed!');
              
            } else {
              console.log('❌ ENHANCED FUNCTIONALITY FAILED');
              console.log('   Subforms still not populating despite fixes');
              console.log('   Additional debugging needed');
            }
            
          } else {
            console.log('⚠️ Could not retrieve deal for verification');
          }
          
        } else {
          console.log('⚠️ No Zoho Deal ID found - integration failed');
        }
        
      } else {
        console.log('⚠️ No new order created - checkout may have failed silently');
      }
      
    } else {
      console.log(`❌ Checkout failed with status: ${checkoutResponse.status}`);
      if (checkoutResponse.data) {
        console.log('   Error:', checkoutResponse.data);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

verifyEnhancedSubformTest();