#!/usr/bin/env node

/**
 * Fix Zoho Tokens and Test Complete Workflow
 * Forces token refresh and then tests the complete sale workflow
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function fixAndTestZohoTokens() {
  console.log('🔧 Fixing Zoho Tokens and Testing Complete Workflow');
  console.log('==================================================');

  try {
    // Step 1: Force token refresh via our API
    console.log('\n🔄 Step 1: Force Token Refresh');
    try {
      const refreshResponse = await axios.post(`${BASE_URL}/api/admin/zoho/refresh-token`);
      console.log('✅ Token refresh triggered:', refreshResponse.data);
    } catch (refreshError) {
      console.log('⚠️ Token refresh via API failed, continuing with test...');
      console.log('Error:', refreshError.response?.data || refreshError.message);
    }

    // Step 2: Wait a moment for tokens to settle
    console.log('\n⏳ Step 2: Waiting for tokens to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Test order workflow that should trigger Zoho integration
    console.log('\n🛒 Step 3: Creating New Order to Test Zoho Integration');
    
    const orderData = {
      userId: 10,
      totalPrice: "1497.49",
      items: [
        {
          id: 133979,
          name: "GLOCK 17CK GEN5 9MM 17RD W/ACRO",
          sku: "PA175S204N-1",
          price: 1495.00,
          quantity: 1,
          manufacturer: "GLOCK",
          category: "Handguns",
          fflRequired: true,
          rsrStockNumber: "GLPA175S204NCK1SCT"
        },
        {
          id: 143966,
          name: "REM BRUSH 7MM / 270 CALIBER",
          sku: "19019",
          price: 2.49,
          quantity: 1,
          manufacturer: "REM",
          category: "Accessories",
          fflRequired: false,
          rsrStockNumber: "REM19019"
        }
      ],
      shippingAddress: {
        firstName: "Michael",
        lastName: "NewCustomer",
        street: "123 New Customer Lane",
        city: "Miami",
        state: "FL",
        zip: "33101",
        phone: "555-123-4567"
      },
      fflDealerId: "1-59-017-07-6F-13700",
      fflRequired: true,
      status: "Pending",
      paymentMethod: "authorize_net"
    };

    console.log('Creating order with fixed tokens...');
    const orderResponse = await axios.post(`${BASE_URL}/api/orders/test-complete-workflow`, orderData);
    const order = orderResponse.data;

    console.log(`\n📊 Order Results:`);
    console.log(`- Order ID: ${order.id}`);
    console.log(`- Total: $${order.totalPrice}`);
    console.log(`- Items: ${order.items.length}`);
    console.log(`- Zoho Sync Status: ${order.zohoSync?.success ? 'SUCCESS ✅' : 'FAILED ❌'}`);

    if (order.zohoSync?.success) {
      console.log('\n🎉 ZOHO INTEGRATION SUCCESS!');
      console.log('✅ Contact created in Zoho Contacts module');
      console.log('✅ Products created in Zoho Products module');
      console.log('✅ Deal created in Zoho Deals module');
      console.log(`✅ Deal ID: ${order.zohoSync.dealId || 'Generated'}`);
      
      return {
        success: true,
        orderId: order.id,
        zohoSync: order.zohoSync
      };
    } else {
      console.log('\n❌ Zoho Integration Still Failed');
      console.log(`Error: ${order.zohoSync?.error || 'Unknown error'}`);
      
      // Step 4: Manual token test
      console.log('\n🧪 Step 4: Testing Tokens Manually');
      const testResponse = await axios.get(`${BASE_URL}/api/admin/zoho/test-connection`);
      console.log('Token test result:', testResponse.data);
      
      return {
        success: false,
        orderId: order.id,
        error: order.zohoSync?.error,
        tokenTest: testResponse.data
      };
    }

  } catch (error) {
    console.error('\n❌ Fix and test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

// Run the fix and test
fixAndTestZohoTokens().then(result => {
  if (result.success) {
    console.log('\n🎉 ZOHO INTEGRATION FULLY WORKING!');
    console.log('Complete sale workflow with Zoho sync is now functional.');
  } else {
    console.log('\n💥 Issues remain with Zoho integration');
    console.log('Additional debugging needed for token authentication.');
  }
});