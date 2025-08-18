// Simple verification to check if recent deals have subforms populated
const axios = require('axios');
require('dotenv').config();

async function checkRecentDeals() {
  console.log('🔍 Checking recent Zoho deals for subforms...');
  
  try {
    const accessToken = process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('No access token found');
    }
    
    console.log('🔐 Using access token:', accessToken.substring(0, 20) + '...');
    
    // Get recent deals (last 5)
    const response = await axios.get(
      'https://www.zohoapis.com/crm/v2/Deals?fields=Deal_Name,Amount,Product_Details,Subform_1&sort_by=Created_Time&sort_order=desc&per_page=5',
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.data) {
      console.log(`✅ Found ${response.data.data.length} recent deals:`);
      
      response.data.data.forEach((deal, index) => {
        console.log(`\n${index + 1}. ${deal.Deal_Name || 'Unnamed Deal'} - $${deal.Amount || 0}`);
        
        const productDetails = deal.Product_Details || [];
        const subform1 = deal.Subform_1 || [];
        
        console.log(`   • Product_Details: ${productDetails.length} items`);
        console.log(`   • Subform_1: ${subform1.length} items`);
        
        if (productDetails.length > 0) {
          console.log('   📦 Product_Details contents:');
          productDetails.forEach(product => {
            console.log(`      - ${product.Product_Name || product.product?.Product_Name || 'Unknown'} x${product.Quantity || product.quantity || 1}`);
          });
        }
        
        if (subform1.length > 0) {
          console.log('   📦 Subform_1 contents:');
          subform1.forEach(product => {
            console.log(`      - ${product.Product_Name || 'Unknown'} x${product.Quantity || 1}`);
          });
        }
        
        if (productDetails.length === 0 && subform1.length === 0) {
          console.log('   ❌ No subform data found');
        }
      });
    } else {
      console.log('❌ No deals data returned');
    }

  } catch (error) {
    console.error('❌ Error checking deals:', error.response?.data || error.message);
  }
}

checkRecentDeals();