// Test comprehensive order processing directly with real data
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testComprehensiveOrdering() {
  console.log('🚀 Testing comprehensive order processing with authentic data...');
  
  try {
    // Use real Glock and accessory from database
    const glock = { 
      id: 133979, 
      sku: 'PA175S204N-1', 
      name: 'GLOCK 17CK GEN5 9MM 17RD W/ACRO', 
      price: 1192.00,
      fflRequired: true,
      manufacturer: 'GLOCK',
      category: 'Handguns'
    };
    
    const accessory = { 
      id: 140442, 
      sku: 'UP64B', 
      name: 'MAGLULA 22LR-380 PSTL BABYUPLULA BLK', 
      price: 24.08,
      fflRequired: false,
      manufacturer: 'MAGULA',
      category: 'Magazines'
    };
    
    // Create order data with real FFL
    const orderData = {
      userId: 5, // Use existing verified user 'testorder@gunfirm.local'
      items: [
        {
          productId: glock.id,
          sku: glock.sku,
          name: glock.name,
          quantity: 1,
          price: glock.price,
          fflRequired: glock.fflRequired,
          manufacturer: glock.manufacturer,
          category: glock.category
        },
        {
          productId: accessory.id,
          sku: accessory.sku,
          name: accessory.name,
          quantity: 1,
          price: accessory.price,
          fflRequired: accessory.fflRequired,
          manufacturer: accessory.manufacturer,
          category: accessory.category
        }
      ],
      shipping_address: JSON.stringify({
        street: '123 Authentic Test Street',
        city: 'Test City',
        state: 'FL',
        zipCode: '12345'
      }),
      fflRecipientId: 1414, // BACK ACRE GUN WORKS database ID
      paymentMethod: 'credit_card',
      totalPrice: (glock.price + accessory.price),
      status: 'pending'
    };
    
    console.log('📦 Creating order with authentic Glock + MAGLULA accessory...');
    console.log('🔫 Glock:', glock.name, '($' + glock.price + ')');
    console.log('🔧 Accessory:', accessory.name, '($' + accessory.price + ')');
    console.log('🏢 FFL ID:', orderData.fflRecipientId);
    console.log('💰 Total:', '$' + orderData.totalPrice);
    
    // Make the order creation request with session simulation
    const response = await axios.post(`${API_BASE}/api/direct-order`, orderData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Order created successfully!');
    console.log('📋 Order ID:', response.data.orderId);
    console.log('🔢 TGF Order Number:', response.data.tgfOrderNumber || 'Not assigned');
    
    // Wait a moment for logging to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check activity logs for the order
    console.log('\n📊 Checking comprehensive activity logs...');
    const logsResponse = await axios.get(`${API_BASE}/api/orders/${response.data.orderId}/activity-logs`);
    
    console.log('📋 Total Activity Logs:', logsResponse.data.logs.length);
    
    if (logsResponse.data.logs.length > 0) {
      console.log('\n📝 Activity Log Details:');
      logsResponse.data.logs.forEach((log, index) => {
        console.log(`${index + 1}. ${log.event_type}:`);
        console.log(`   Status: ${log.success ? '✅ Success' : '❌ Failed'}`);
        console.log(`   Time: ${log.timestamp}`);
        console.log(`   TGF Order: ${log.tgf_order_number}`);
        if (log.details) {
          console.log(`   Details: ${typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}`);
        }
        console.log('');
      });
    }
    
    // Check if we have an APP Response summary
    const appResponseLog = logsResponse.data.logs.find(log => log.event_type === 'app_response_compilation');
    if (appResponseLog) {
      console.log('📄 APP Response Field Summary:');
      console.log(appResponseLog.details);
    }
    
    // Provide Zoho verification instructions
    console.log('\n🔍 Zoho Integration Verification:');
    console.log('👤 Contacts Module: Search for "testorder@gunfirm.local"');
    console.log('📦 Products Module: Search for SKUs:', glock.sku, 'and', accessory.sku);
    console.log('💼 Deals Module: Search for TGF order number:', response.data.tgfOrderNumber || 'test' + String(response.data.orderId).padStart(8, '0'));
    console.log('📋 APP Response Field: Check Deal module for complete processing log');
    
    return {
      success: true,
      orderId: response.data.orderId,
      tgfOrderNumber: response.data.tgfOrderNumber,
      totalLogs: logsResponse.data.logs.length,
      products: [glock.sku, accessory.sku],
      ffl: orderData.fflRecipientId
    };
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
testComprehensiveOrdering()
  .then((result) => {
    console.log('\n🎉 Comprehensive order processing test completed!');
    console.log('📊 Final Results:', result);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
  });