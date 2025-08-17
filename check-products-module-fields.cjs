const https = require('https');

async function checkProductsModuleFields() {
  try {
    console.log('🔍 Checking available fields in Zoho Products Module only...');
    
    // Read Zoho tokens from environment
    const accessToken = process.env.ZOHO_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error('❌ ZOHO_ACCESS_TOKEN not found in environment');
      return;
    }

    const options = {
      hostname: 'www.zohoapis.com',
      port: 443,
      path: '/crm/v2/settings/fields?module=Products',
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    if (response && response.fields) {
      console.log('\n📋 PRODUCTS MODULE AVAILABLE FIELDS:');
      console.log('='.repeat(60));
      
      // Filter and show relevant fields
      const relevantFields = response.fields
        .filter(field => field.field_label && field.api_name)
        .sort((a, b) => a.field_label.localeCompare(b.field_label));
      
      relevantFields.forEach(field => {
        const required = field.required ? ' (REQUIRED)' : '';
        const type = field.data_type ? ` [${field.data_type}]` : '';
        console.log(`• ${field.field_label} (${field.api_name})${type}${required}`);
      });
      
      console.log('\n🎯 PRODUCTS MODULE SHOULD CONTAIN (Static Info Only):');
      console.log('✅ Product_Code (Manufacturer Part Number - e.g., SP00735)');
      console.log('✅ Product_Name (Product description)');
      console.log('✅ Manufacturer (e.g., "Glock Inc")');
      console.log('✅ Product_Category (e.g., "Handguns")');
      console.log('✅ FFL_Required (Boolean)');
      console.log('✅ Drop_Ship_Eligible (Boolean)');
      console.log('✅ In_House_Only (Boolean)');
      
      console.log('\n🚫 PRODUCTS MODULE SHOULD NOT CONTAIN:');
      console.log('❌ Distributor information (goes to Deal subform only)');
      console.log('❌ Distributor_Part_Number (goes to Deal subform only)');
      console.log('❌ Unit_Price (goes to Deal subform only)');
      console.log('❌ Pricing information (goes to Deal subform only)');
      console.log('❌ Quantity (goes to Deal subform only)');
      
    } else {
      console.error('❌ No fields found or API error:', response);
    }
  } catch (error) {
    console.error('❌ Error checking fields:', error.message);
  }
}

checkProductsModuleFields();