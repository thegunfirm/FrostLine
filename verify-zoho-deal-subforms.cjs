// Verify Zoho deal creation and subform population for recent test sale
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function verifyZohoDealSubforms() {
  console.log('🔍 ZOHO DEAL & SUBFORM VERIFICATION');
  console.log('===================================');

  try {
    // Step 1: Get the most recent deal ID from database
    console.log('📋 Getting recent order from database...');
    
    // Login to get session for API access
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'bronze.test@example.com',
      password: 'test123'
    });
    const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';

    // Get recent orders from database directly via SQL
    const orderQuery = await axios.get(`${BASE_URL}/api/debug/recent-orders`, {
      headers: { 'Cookie': sessionCookie }
    });

    if (orderQuery.status !== 200) {
      console.log('⚠️  Could not fetch recent orders, checking manually...');
      
      // Manual check using hardcoded recent deal ID if available
      const recentDealIds = [
        '6585331000001001100',  // From our previous tests
        '6585331000001001064'   // Backup
      ];
      
      for (const dealId of recentDealIds) {
        console.log(`🔍 Checking deal: ${dealId}`);
        await verifySpecificDeal(dealId, sessionCookie);
      }
      return;
    }

    const orders = orderQuery.data;
    if (orders.length === 0) {
      console.log('❌ No recent orders found');
      return;
    }

    const recentOrder = orders[0];
    console.log(`✅ Found recent order: ${recentOrder.id}`);
    console.log(`   Zoho Deal ID: ${recentOrder.zoho_deal_id || 'None'}`);
    
    if (!recentOrder.zoho_deal_id) {
      console.log('❌ No Zoho Deal ID found for recent order');
      return;
    }

    // Step 2: Verify the deal and its subforms
    await verifySpecificDeal(recentOrder.zoho_deal_id, sessionCookie);

  } catch (error) {
    console.error('❌ Verification failed:', error.response?.data || error.message);
  }
}

async function verifySpecificDeal(dealId, sessionCookie) {
  console.log(`\n🎯 VERIFYING DEAL: ${dealId}`);
  console.log('================================');
  
  try {
    // Step 1: Get deal details from Zoho
    console.log('📊 Fetching deal details from Zoho...');
    const dealResponse = await axios.get(`${BASE_URL}/api/zoho/deals/${dealId}`, {
      headers: { 'Cookie': sessionCookie }
    });

    if (dealResponse.status === 200) {
      const deal = dealResponse.data;
      console.log('✅ Deal found in Zoho CRM');
      console.log(`   Deal Name: ${deal.Deal_Name || 'Unknown'}`);
      console.log(`   Amount: $${deal.Amount || 'Unknown'}`);
      console.log(`   Stage: ${deal.Stage || 'Unknown'}`);
      
      // Step 2: Check for subform data
      console.log('\n🔍 Checking subform data...');
      
      // Look for Product_Details subform (standard field)
      if (deal.Product_Details && Array.isArray(deal.Product_Details) && deal.Product_Details.length > 0) {
        console.log(`✅ Product_Details subform found with ${deal.Product_Details.length} items:`);
        deal.Product_Details.forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.Product_Name || product.Product_Code || 'Unknown Product'}`);
          console.log(`      Quantity: ${product.Quantity || 'N/A'}`);
          console.log(`      Price: $${product.Unit_Price || 'N/A'}`);
          console.log(`      Distributor Part: ${product.Distributor_Part_Number || 'N/A'}`);
        });
      }
      
      // Look for Subform_1 (custom field)
      if (deal.Subform_1 && Array.isArray(deal.Subform_1) && deal.Subform_1.length > 0) {
        console.log(`✅ Subform_1 found with ${deal.Subform_1.length} items:`);
        deal.Subform_1.forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.Product_Name || product.Product_Code || 'Unknown Product'}`);
          console.log(`      Quantity: ${product.Quantity || 'N/A'}`);
          console.log(`      Price: $${product.Unit_Price || 'N/A'}`);
        });
      }
      
      // Check if no subforms found
      if ((!deal.Product_Details || deal.Product_Details.length === 0) && 
          (!deal.Subform_1 || deal.Subform_1.length === 0)) {
        console.log('⚠️  No subform data found in deal');
        console.log('   This could indicate:');
        console.log('   • Subform creation failed');
        console.log('   • Different field names being used');
        console.log('   • Products not properly mapped');
        
        // Show all available fields for debugging
        console.log('\n📋 Available fields in deal:');
        Object.keys(deal).forEach(key => {
          if (Array.isArray(deal[key]) && deal[key].length > 0) {
            console.log(`   ${key}: Array with ${deal[key].length} items`);
          } else if (deal[key] && typeof deal[key] === 'object') {
            console.log(`   ${key}: Object`);
          } else if (deal[key]) {
            console.log(`   ${key}: ${deal[key]}`);
          }
        });
      }
      
    } else {
      console.log('❌ Deal not found in Zoho CRM');
    }

  } catch (dealError) {
    console.log('❌ Failed to fetch deal details');
    console.log(`   Error: ${dealError.response?.status} - ${dealError.response?.data?.message || dealError.message}`);
  }
}

verifyZohoDealSubforms();