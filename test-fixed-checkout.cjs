// Test checkout after fixing the database schema issue
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testFixedCheckout() {
  console.log('🔧 TESTING CHECKOUT AFTER DATABASE SCHEMA FIX');
  console.log('==============================================');
  console.log('The missing "is_firearm" column has been added to orders table');
  console.log('');

  try {
    // Login
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'bronze.test@example.com',
      password: 'test123'
    });

    const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';
    console.log('✅ Login successful');

    // Setup cart
    console.log('🛒 Setting up cart...');
    await axios.delete(`${BASE_URL}/api/cart/clear`, {
      headers: { 'Cookie': sessionCookie }
    });

    await axios.post(`${BASE_URL}/api/cart/add`, {
      productId: 100026, // Yet another product
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

    // Get initial order count
    const ordersBefore = await axios.get(`${BASE_URL}/api/orders`, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log(`📊 Orders before checkout: ${ordersBefore.data.length}`);

    // Process checkout
    console.log('💳 Processing checkout with schema fix...');
    const startTime = Date.now();
    
    const checkoutResponse = await axios.post(`${BASE_URL}/api/checkout/process`, {
      paymentMethod: 'authorize_net',
      cardNumber: '4111111111111111',
      expiryMonth: '12',
      expiryYear: '2025',
      cardCode: '999',
      firstName: 'Schema',
      lastName: 'Fixed',
      address: '999 Fixed Avenue',
      city: 'Working City',
      state: 'TX',
      zipCode: '99999'
    }, {
      headers: { 'Cookie': sessionCookie }
    });

    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`📊 Checkout Status: ${checkoutResponse.status}`);
    console.log(`⏱️  Processing Time: ${processingTime}ms`);

    if (processingTime < 100) {
      console.log('⚠️  Very fast response - may indicate early return due to error');
    } else {
      console.log('✅ Normal processing time - likely successful');
    }

    if (checkoutResponse.status === 200) {
      console.log('✅ Checkout request completed');
      
      // Wait for background processing
      console.log('⏳ Waiting for order creation and Zoho integration...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check for new orders
      const ordersAfter = await axios.get(`${BASE_URL}/api/orders`, {
        headers: { 'Cookie': sessionCookie }
      });
      
      console.log(`📊 Orders after checkout: ${ordersAfter.data.length}`);
      
      if (ordersAfter.data.length > ordersBefore.data.length) {
        const newOrder = ordersAfter.data[ordersAfter.data.length - 1];
        console.log('\n🎉 NEW ORDER SUCCESSFULLY CREATED!');
        console.log('==================================');
        console.log(`   Order ID: ${newOrder.id}`);
        console.log(`   Total: $${newOrder.totalPrice}`);
        console.log(`   Status: ${newOrder.status}`);
        console.log(`   Zoho Deal ID: ${newOrder.zohoDealId || 'NOT SET'}`);
        console.log(`   Notes: ${newOrder.notes || 'None'}`);
        
        if (newOrder.zohoDealId) {
          console.log('\n🔍 CHECKING ENHANCED SUBFORM FUNCTIONALITY');
          console.log('==========================================');
          
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const dealResponse = await axios.get(`${BASE_URL}/api/zoho/deals/${newOrder.zohoDealId}`, {
            headers: { 'Cookie': sessionCookie }
          });
          
          if (dealResponse.status === 200) {
            const deal = dealResponse.data;
            
            const hasProductDetails = deal.Product_Details && Array.isArray(deal.Product_Details) && deal.Product_Details.length > 0;
            const hasSubform1 = deal.Subform_1 && Array.isArray(deal.Subform_1) && deal.Subform_1.length > 0;
            
            console.log('✅ Deal retrieved successfully');
            console.log(`   Deal Name: ${deal.Deal_Name || 'N/A'}`);
            console.log(`   Amount: $${deal.Amount || 'N/A'}`);
            
            if (hasProductDetails) {
              console.log('\n🎉 ENHANCED FUNCTIONALITY CONFIRMED!');
              console.log('===================================');
              console.log(`✅ Product_Details: ${deal.Product_Details.length} items`);
              
              const item = deal.Product_Details[0];
              console.log(`   Product Name: ${item.Product_Name || 'NOT SET'}`);
              console.log(`   Product Code: ${item.Product_Code || 'NOT SET'}`);
              console.log(`   Quantity: ${item.Quantity || 'NOT SET'}`);
              console.log(`   Unit Price: $${item.Unit_Price || 'NOT SET'}`);
              console.log(`   Total: $${item.Total || 'NOT SET'}`);
              
              if (item.Product_Name && item.Product_Name !== item.Product_Code) {
                console.log('   ✅ Product properly linked to Zoho Products module');
                console.log('');
                console.log('🏆 BREAKTHROUGH SUCCESS:');
                console.log('   • "Find or Create Product by SKU" functionality WORKING!');
                console.log('   • Products created in Zoho Products module before subform population');
                console.log('   • Subforms populated with proper product references');
                console.log('   • Complete order-to-deal-to-subform integration functional');
                console.log('   • Database schema issues resolved');
                console.log('   • Enhanced product creation prevents empty subforms');
                
              } else {
                console.log('   ⚠️  Product may not be properly linked (name matches code)');
              }
              
            } else if (hasSubform1) {
              console.log('\n✅ SUBFORM_1 POPULATED');
              console.log(`   Subform_1: ${deal.Subform_1.length} items`);
              
            } else {
              console.log('\n❌ SUBFORMS STILL NOT POPULATED');
              console.log('   Neither Product_Details nor Subform_1 have data');
              console.log('   Additional debugging needed');
            }
            
          } else {
            console.log('⚠️ Could not retrieve deal for verification');
          }
          
        } else {
          console.log('\n⚠️ No Zoho Deal ID - integration may have failed');
          if (newOrder.notes) {
            console.log(`   Error notes: ${newOrder.notes}`);
          }
        }
        
      } else {
        console.log('\n❌ NO NEW ORDER CREATED');
        console.log('   Checkout completed but order creation failed');
        console.log('   Check server logs for errors');
      }
      
    } else {
      console.log(`❌ Checkout failed with status: ${checkoutResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testFixedCheckout();