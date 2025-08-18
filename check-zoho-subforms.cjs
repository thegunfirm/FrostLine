// Check recent Zoho deals for subform creation
const axios = require('axios');

async function checkRecentZohoDeals() {
  console.log('🔍 Checking recent Zoho deals for subform creation...');
  
  try {
    // Get access token from environment variable
    const accessToken = process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.log('❌ No ZOHO_WEBSERVICES_ACCESS_TOKEN found in environment');
      return;
    }
    
    console.log('🔐 Using access token:', accessToken.substring(0, 20) + '...');
    
    // Query recent deals from Zoho CRM
    const response = await axios.get('https://www.zohoapis.com/crm/v2/Deals', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        sort_by: 'Created_Time',
        sort_order: 'desc',
        per_page: 5
      }
    });
    
    if (response.data && response.data.data) {
      const deals = response.data.data;
      console.log(`✅ Found ${deals.length} recent deals:`);
      
      deals.forEach((deal, index) => {
        console.log(`\n${index + 1}. Deal: ${deal.Deal_Name || 'Unnamed'}`);
        console.log(`   Amount: $${deal.Amount || 'N/A'}`);
        console.log(`   Created: ${deal.Created_Time || 'N/A'}`);
        console.log(`   Stage: ${deal.Stage || 'N/A'}`);
        
        // Check for subform data (Product Details)
        if (deal.Product_Details && Array.isArray(deal.Product_Details)) {
          console.log(`   📋 Product Details Subform: ${deal.Product_Details.length} items`);
          deal.Product_Details.forEach((item, idx) => {
            console.log(`      ${idx + 1}. ${item.product?.Product_Name || item.Product_Name || 'Product'}`);
            console.log(`         SKU: ${item.product?.Product_Code || item.Product_Code || 'N/A'}`);
            console.log(`         Qty: ${item.quantity || item.Quantity || 'N/A'}`);
            console.log(`         Price: $${item.list_price || item.List_Price || 'N/A'}`);
          });
        } else {
          console.log(`   📋 Product Details Subform: No items found`);
        }
        
        // Check other potential subform fields
        if (deal.Subform_1 && Array.isArray(deal.Subform_1)) {
          console.log(`   📋 Subform_1: ${deal.Subform_1.length} items`);
        }
        
        // Check TGF specific fields
        if (deal.TGF_Order_Number) {
          console.log(`   🎯 TGF Order Number: ${deal.TGF_Order_Number}`);
        }
        if (deal.APP_Status) {
          console.log(`   📱 APP Status: ${deal.APP_Status}`);
        }
      });
      
      // Check if any deal was created in the last 10 minutes (likely from our test)
      const recentCutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const testDeals = deals.filter(deal => {
        const createdTime = new Date(deal.Created_Time);
        return createdTime > recentCutoff;
      });
      
      if (testDeals.length > 0) {
        console.log(`\n🎯 RECENT TEST DEALS (last 10 minutes): ${testDeals.length}`);
        testDeals.forEach((deal, idx) => {
          console.log(`${idx + 1}. ${deal.Deal_Name} - Created: ${deal.Created_Time}`);
          if (deal.Product_Details && deal.Product_Details.length > 0) {
            console.log(`   ✅ SUBFORM CREATED: ${deal.Product_Details.length} accessories`);
          } else {
            console.log(`   ❌ NO SUBFORM DATA`);
          }
        });
      } else {
        console.log('\n⚠️ No deals created in the last 10 minutes');
        console.log('The test may not have triggered Zoho deal creation');
      }
      
    } else {
      console.log('❌ No deals data in response');
    }
    
  } catch (error) {
    console.error('❌ Error checking Zoho deals:', error.response?.data || error.message);
  }
}

checkRecentZohoDeals();