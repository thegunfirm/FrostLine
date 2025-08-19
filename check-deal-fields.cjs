/**
 * Check what fields are actually available in the created deal
 */

const fs = require('fs');

async function checkDealFields() {
  console.log('🔍 Checking Zoho Deal Fields...\n');

  // Get token from environment or generate new one
  let accessToken = process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('🔄 No environment token found, generating fresh token...');
    
    const refreshResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        refresh_token: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN,
        client_id: process.env.ZOHO_WEBSERVICES_CLIENT_ID,
        client_secret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET,
        grant_type: 'refresh_token'
      })
    });

    const tokenData = await refreshResponse.json();
    
    if (tokenData.access_token) {
      accessToken = tokenData.access_token;
      console.log('✅ Fresh token generated');
    } else {
      console.log('❌ Token generation failed:', tokenData);
      return;
    }
  }

  // Use the deal ID from the last test
  const dealId = '6585331000001019048';
  
  try {
    console.log(`📋 Fetching deal ${dealId} with all fields...`);
    
    const response = await fetch(`https://www.zohoapis.com/crm/v2/Deals/${dealId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + accessToken,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (result.data && result.data[0]) {
      const deal = result.data[0];
      
      console.log('📊 Available fields in the deal:');
      const allFields = Object.keys(deal).sort();
      allFields.forEach(field => {
        const value = deal[field];
        const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
        console.log(`  • ${field}: ${type}`);
        
        // Show details for potential subform fields
        if (field.toLowerCase().includes('product') || 
            field.toLowerCase().includes('subform') || 
            field.toLowerCase().includes('line') ||
            Array.isArray(value) && value.length > 0) {
          
          if (Array.isArray(value) && value.length > 0) {
            console.log(`    ↳ Array contents preview:`, JSON.stringify(value[0], null, 4).substring(0, 200) + '...');
          } else if (value && typeof value === 'object') {
            console.log(`    ↳ Object preview:`, JSON.stringify(value, null, 4).substring(0, 200) + '...');
          }
        }
      });
      
      // Specifically check for product-related fields
      console.log('\n🔍 Checking for product-related fields:');
      
      const productFields = [
        'Products', 'Product_Details', 'Subform_1', 'Line_Items', 
        'Order_Items', 'Deal_Products', 'Items', 'ProductDetails'
      ];
      
      productFields.forEach(field => {
        if (deal[field] !== undefined) {
          console.log(`✅ Found ${field}:`, Array.isArray(deal[field]) ? `${deal[field].length} items` : typeof deal[field]);
          if (Array.isArray(deal[field]) && deal[field].length > 0) {
            console.log(`   First item:`, JSON.stringify(deal[field][0], null, 2));
          }
        } else {
          console.log(`❌ ${field}: not found`);
        }
      });
      
    } else {
      console.log('❌ Deal not found or no data returned');
      console.log('Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error fetching deal:', error);
  }
}

checkDealFields();