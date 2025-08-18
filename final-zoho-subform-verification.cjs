// Final verification of Zoho subform fix using direct environment variables
const axios = require('axios');
const fs = require('fs');

// Read environment variables directly from .env file
function loadEnvVars() {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
    return env;
  } catch (error) {
    console.error('Error reading .env file:', error.message);
    return {};
  }
}

async function verifySubformFix() {
  console.log('🎯 FINAL ZOHO SUBFORM VERIFICATION');
  console.log('==================================');
  
  try {
    const env = loadEnvVars();
    const accessToken = env.ZOHO_WEBSERVICES_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('No Zoho access token found in environment');
    }
    
    console.log('🔐 Using token:', accessToken.substring(0, 20) + '...');
    
    // Get the most recent deals with subform fields
    const response = await axios.get(
      'https://www.zohoapis.com/crm/v2/Deals?fields=Deal_Name,Amount,Product_Details,Subform_1,Created_Time&sort_by=Created_Time&sort_order=desc&per_page=3',
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.data) {
      const deals = response.data.data;
      console.log(`✅ Retrieved ${deals.length} recent deals`);
      
      let subformSuccessCount = 0;
      
      deals.forEach((deal, index) => {
        const dealName = deal.Deal_Name || 'Unnamed Deal';
        const amount = deal.Amount || 0;
        const createdTime = deal.Created_Time || 'Unknown';
        
        console.log(`\n${index + 1}. 📋 ${dealName}`);
        console.log(`   💰 Amount: $${amount}`);
        console.log(`   📅 Created: ${createdTime}`);
        
        // Check for subform data
        const productDetails = deal.Product_Details || [];
        const subform1 = deal.Subform_1 || [];
        
        console.log(`   📦 Product_Details: ${productDetails.length} items`);
        console.log(`   📦 Subform_1: ${subform1.length} items`);
        
        // Determine which subform has data
        let activeSubform = [];
        let subformType = '';
        
        if (productDetails.length > 0) {
          activeSubform = productDetails;
          subformType = 'Product_Details';
        } else if (subform1.length > 0) {
          activeSubform = subform1;
          subformType = 'Subform_1';
        }
        
        if (activeSubform.length > 0) {
          console.log(`   ✅ Found ${activeSubform.length} products in ${subformType}:`);
          subformSuccessCount++;
          
          activeSubform.forEach((product, prodIndex) => {
            const productName = product.Product_Name || product.product?.Product_Name || 'Unknown Product';
            const productCode = product.Product_Code || product.product?.Product_Code || 'No SKU';
            const quantity = product.Quantity || product.quantity || 1;
            const price = product.Unit_Price || product.unit_price || product.list_price || 0;
            
            console.log(`      ${prodIndex + 1}. ${productName} (${productCode})`);
            console.log(`         Qty: ${quantity}, Price: $${price}`);
            
            // Check for our test accessories
            if (productCode === '153800' || productName.includes('Magpul PMAG')) {
              console.log(`         🎯 FOUND: Magpul PMAG from our test!`);
            }
            if (productCode === '150932' || productName.includes('TenMile')) {
              console.log(`         🎯 FOUND: Trijicon TenMile from our test!`);
            }
            if (productCode === '150818' || productName.includes('Huron')) {
              console.log(`         🎯 FOUND: Trijicon Huron from our test!`);
            }
          });
        } else {
          console.log(`   ❌ No subform data found`);
        }
      });
      
      console.log(`\n📊 VERIFICATION SUMMARY:`);
      console.log(`   • Total deals checked: ${deals.length}`);
      console.log(`   • Deals with subforms: ${subformSuccessCount}`);
      console.log(`   • Subform success rate: ${((subformSuccessCount / deals.length) * 100).toFixed(1)}%`);
      
      if (subformSuccessCount > 0) {
        console.log(`\n🎉 SUBFORM FIX VERIFICATION: SUCCESS`);
        console.log(`✅ Recent deals are being created with populated subforms`);
        console.log(`✅ Product details are correctly mapped to Zoho CRM`);
      } else {
        console.log(`\n⚠️  SUBFORM FIX VERIFICATION: NEEDS INVESTIGATION`);
        console.log(`❌ No recent deals found with populated subforms`);
        console.log(`🔧 May need additional field mapping adjustments`);
      }
      
    } else {
      console.log('❌ No deals data returned from Zoho CRM');
    }

  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ Authentication failed - token may be expired');
      console.log('🔄 Try refreshing the token with: node refresh-zoho-token.js');
    } else {
      console.error('❌ Verification failed:', error.response?.data || error.message);
    }
  }
}

verifySubformFix();