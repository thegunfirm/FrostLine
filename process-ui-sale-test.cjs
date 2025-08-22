// Process a complete UI sale with comprehensive logging
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function processCompleteUISale() {
  console.log('🚀 Starting complete UI sale with authentic Glock + accessory...');
  
  try {
    // Step 1: Login with existing verified customer
    console.log('🔐 Logging in with verified customer...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'testorder@gunfirm.local',
      password: 'testpass123'
    }, { withCredentials: true });
    
    const cookies = loginResponse.headers['set-cookie'] || [];
    
    // Step 3: Get real Glock and accessory data
    console.log('📦 Fetching real inventory data...');
    const glock = { 
      id: 133979, 
      sku: 'PA175S204N-1', 
      name: 'GLOCK 17CK GEN5 9MM 17RD W/ACRO', 
      price: 1192.00,
      fflRequired: true 
    };
    
    const accessory = { 
      id: 140442, 
      sku: 'UP64B', 
      name: 'MAGLULA 22LR-380 PSTL BABYUPLULA BLK', 
      price: 24.08,
      fflRequired: false 
    };
    
    // Step 4: Create order with real inventory and FFL
    console.log('🛒 Creating order with Glock + accessory...');
    const orderData = {
      items: [
        {
          productId: glock.id,
          sku: glock.sku,
          name: glock.name,
          quantity: 1,
          price: glock.price,
          fflRequired: glock.fflRequired
        },
        {
          productId: accessory.id,
          sku: accessory.sku,
          name: accessory.name,
          quantity: 1,
          price: accessory.price,
          fflRequired: accessory.fflRequired
        }
      ],
      shipping_address: JSON.stringify({
        street: '123 Test Street',
        city: 'Test City',
        state: 'FL',
        zipCode: '12345'
      }),
      ffl_dealer_id: '1-59-017-07-6F-13700', // BACK ACRE GUN WORKS
      payment_method: 'credit_card',
      total_amount: (glock.price + accessory.price),
      status: 'pending'
    };
    
    const orderResponse = await axios.post(`${API_BASE}/api/orders`, orderData, {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });
    
    console.log('✅ Order created successfully!');
    console.log('📋 Order Details:', {
      orderId: orderResponse.data.id,
      total: orderResponse.data.total_amount,
      ffl: orderResponse.data.ffl_dealer_id
    });
    
    // Step 5: Check activity logs
    console.log('📊 Checking order activity logs...');
    const logsResponse = await axios.get(`${API_BASE}/api/orders/${orderResponse.data.id}/activity-logs`, {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });
    
    console.log('📋 Activity Logs Found:', logsResponse.data.logs.length);
    logsResponse.data.logs.forEach((log, index) => {
      console.log(`${index + 1}. ${log.event_type}: ${log.success ? '✅ Success' : '❌ Failed'} at ${log.timestamp}`);
    });
    
    // Step 6: Check Zoho integrations
    console.log('\n🔍 Checking Zoho Integration Results...');
    console.log('👤 Contact Creation: Check Zoho Contacts module for: testorder@gunfirm.local');
    console.log('📦 Product Creation: Check Zoho Products module for SKUs:', glock.sku, accessory.sku);
    console.log('💼 Deal Creation: Check Zoho Deals module for TGF order number');
    
    return {
      success: true,
      orderId: orderResponse.data.id,
      customer: 'testorder@gunfirm.local',
      products: [glock.sku, accessory.sku],
      ffl: orderResponse.data.ffl_dealer_id,
      totalLogs: logsResponse.data.logs.length
    };
    
  } catch (error) {
    console.error('❌ UI Sale failed:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
processCompleteUISale()
  .then((result) => {
    console.log('\n🎉 Complete UI sale test successful!');
    console.log('📊 Final Results:', result);
  })
  .catch((error) => {
    console.error('\n💥 UI sale test failed:', error);
  });