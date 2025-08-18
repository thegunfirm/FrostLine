// Check specific Zoho deal for subform verification
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const DEAL_ID = '6585331000001001100';

async function checkSpecificZohoDeal() {
  console.log('🔍 CHECKING ZOHO DEAL SUBFORMS');
  console.log('==============================');
  console.log(`Deal ID: ${DEAL_ID}`);
  console.log('');

  try {
    // Login to get session
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'bronze.test@example.com',
      password: 'test123'
    });
    const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';

    // Get deal details directly from Zoho
    console.log('📊 Fetching deal from Zoho CRM...');
    const dealResponse = await axios.get(`${BASE_URL}/api/zoho/deals/${DEAL_ID}`, {
      headers: { 'Cookie': sessionCookie }
    });

    if (dealResponse.status === 200) {
      const deal = dealResponse.data;
      console.log('✅ DEAL FOUND IN ZOHO CRM');
      console.log('==========================');
      console.log(`Deal Name: ${deal.Deal_Name || 'N/A'}`);
      console.log(`Amount: $${deal.Amount || 'N/A'}`);
      console.log(`Stage: ${deal.Stage || 'N/A'}`);
      console.log(`Owner: ${deal.Owner?.name || 'N/A'}`);
      console.log('');

      // Check Product_Details subform
      console.log('🔍 CHECKING PRODUCT_DETAILS SUBFORM:');
      if (deal.Product_Details && Array.isArray(deal.Product_Details) && deal.Product_Details.length > 0) {
        console.log(`✅ Found ${deal.Product_Details.length} products in Product_Details:`);
        deal.Product_Details.forEach((product, index) => {
          console.log(`\n   ${index + 1}. PRODUCT:`);
          console.log(`      Name: ${product.Product_Name || 'N/A'}`);
          console.log(`      Code: ${product.Product_Code || 'N/A'}`);
          console.log(`      Quantity: ${product.Quantity || 'N/A'}`);
          console.log(`      Unit Price: $${product.Unit_Price || 'N/A'}`);
          console.log(`      Total: $${product.Total || 'N/A'}`);
          console.log(`      Distributor Part #: ${product.Distributor_Part_Number || 'N/A'}`);
          console.log(`      FFL Required: ${product.FFL_Required || 'N/A'}`);
        });
      } else {
        console.log('❌ No Product_Details subform data found');
      }

      // Check Subform_1 (custom subform)
      console.log('\n🔍 CHECKING SUBFORM_1:');
      if (deal.Subform_1 && Array.isArray(deal.Subform_1) && deal.Subform_1.length > 0) {
        console.log(`✅ Found ${deal.Subform_1.length} products in Subform_1:`);
        deal.Subform_1.forEach((product, index) => {
          console.log(`\n   ${index + 1}. PRODUCT:`);
          console.log(`      Name: ${product.Product_Name || 'N/A'}`);
          console.log(`      Code: ${product.Product_Code || 'N/A'}`);
          console.log(`      Quantity: ${product.Quantity || 'N/A'}`);
          console.log(`      Unit Price: $${product.Unit_Price || 'N/A'}`);
        });
      } else {
        console.log('❌ No Subform_1 data found');
      }

      // Check for any other subform-like fields
      console.log('\n🔍 OTHER POTENTIAL SUBFORMS:');
      const subformFields = Object.keys(deal).filter(key => 
        Array.isArray(deal[key]) && deal[key].length > 0
      );
      
      if (subformFields.length > 0) {
        subformFields.forEach(field => {
          if (field !== 'Product_Details' && field !== 'Subform_1') {
            console.log(`   ${field}: Array with ${deal[field].length} items`);
          }
        });
      } else {
        console.log('   No additional subform arrays found');
      }

      // Summary
      console.log('\n📋 VERIFICATION SUMMARY:');
      const hasProductDetails = deal.Product_Details && deal.Product_Details.length > 0;
      const hasSubform1 = deal.Subform_1 && deal.Subform_1.length > 0;
      
      if (hasProductDetails || hasSubform1) {
        console.log('✅ SUBFORMS SUCCESSFULLY POPULATED');
        console.log(`   Product_Details: ${hasProductDetails ? '✅ YES' : '❌ NO'}`);
        console.log(`   Subform_1: ${hasSubform1 ? '✅ YES' : '❌ NO'}`);
        
        const totalProducts = (deal.Product_Details?.length || 0) + (deal.Subform_1?.length || 0);
        console.log(`   Total products found: ${totalProducts}`);
      } else {
        console.log('❌ NO SUBFORM DATA FOUND');
        console.log('   This indicates the subform population failed');
      }

    } else {
      console.log('❌ DEAL NOT FOUND');
      console.log(`   HTTP Status: ${dealResponse.status}`);
    }

  } catch (error) {
    console.error('❌ ERROR CHECKING DEAL:');
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${error.response?.data?.message || error.message}`);
  }
}

checkSpecificZohoDeal();