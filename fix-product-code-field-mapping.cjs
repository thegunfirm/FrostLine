// Fix Product_Code field mapping by using existing field or creating proper custom fields
console.log('🔧 Fixing Product_Code field mapping in Zoho');

async function fixFieldMapping() {
  try {
    // Get fresh token
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ZOHO_WEBSERVICES_CLIENT_ID,
        client_secret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET,
        refresh_token: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN
      })
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('Failed to get token');
    }
    
    console.log('✅ Token obtained');
    
    // Check if we can use Product_Code1 field (the existing one)
    console.log('\n🔍 Testing with existing Product_Code1 field...');
    
    const testPayload1 = {
      Product_Name: 'Test with Product_Code1 Field',
      Product_Code1: 'TEST-CODE1-789', // Try the existing field
      Manufacturer: 'Test Mfg'
    };
    
    const test1Response = await fetch('https://www.zohoapis.com/crm/v2/Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: [testPayload1] })
    });
    
    const test1Result = await test1Response.json();
    console.log('📤 Product_Code1 test response:', JSON.stringify(test1Result, null, 2));
    
    // Create custom fields with proper naming
    console.log('\n🔧 Creating custom fields with proper structure...');
    
    // Create Manufacturer_SKU field
    const mfgSkuField = {
      fields: [{
        api_name: 'Manufacturer_SKU',
        field_label: 'Manufacturer SKU',
        data_type: 'text',
        length: 100,
        tooltip: {
          name: 'Manufacturer SKU or Part Number'
        }
      }]
    };
    
    const mfgSkuResponse = await fetch('https://www.zohoapis.com/crm/v2/settings/fields?module=Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mfgSkuField)
    });
    
    const mfgSkuResult = await mfgSkuResponse.json();
    console.log('📤 Manufacturer_SKU field result:', JSON.stringify(mfgSkuResult, null, 2));
    
    // Create RSR_Stock_Number field
    const rsrStockField = {
      fields: [{
        api_name: 'RSR_Stock_Number',
        field_label: 'RSR Stock Number',
        data_type: 'text',
        length: 100,
        tooltip: {
          name: 'RSR distributor stock number'
        }
      }]
    };
    
    const rsrStockResponse = await fetch('https://www.zohoapis.com/crm/v2/settings/fields?module=Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rsrStockField)
    });
    
    const rsrStockResult = await rsrStockResponse.json();
    console.log('📤 RSR_Stock_Number field result:', JSON.stringify(rsrStockResult, null, 2));
    
    // Wait for fields to be available
    console.log('\n⏳ Waiting for new fields...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test with new fields
    console.log('\n🧪 Testing with new custom fields...');
    
    const testPayload2 = {
      Product_Name: 'Test with Custom Fields',
      Manufacturer_SKU: 'GLOCK43X', // Manufacturer part number
      RSR_Stock_Number: 'GLOCK43X', // RSR stock number
      Manufacturer: 'Glock Inc'
    };
    
    const test2Response = await fetch('https://www.zohoapis.com/crm/v2/Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: [testPayload2] })
    });
    
    const test2Result = await test2Response.json();
    console.log('📤 Custom fields test response:', JSON.stringify(test2Result, null, 2));
    
    if (test2Result.data && test2Result.data[0] && test2Result.data[0].status === 'success') {
      const testProductId = test2Result.data[0].details.id;
      console.log(`✅ Test product created: ${testProductId}`);
      
      // Verify the custom fields were saved
      setTimeout(async () => {
        console.log('\n🔍 Verifying custom fields...');
        
        const verifyResponse = await fetch(`https://www.zohoapis.com/crm/v2/Products/${testProductId}?fields=Product_Name,Manufacturer_SKU,RSR_Stock_Number,Manufacturer`, {
          headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
        });
        
        const verifyData = await verifyResponse.json();
        
        if (verifyData.data && verifyData.data[0]) {
          const savedProduct = verifyData.data[0];
          console.log('📋 Custom fields verification:');
          console.log(`  Product_Name: "${savedProduct.Product_Name || 'EMPTY'}"`);
          console.log(`  Manufacturer_SKU: "${savedProduct.Manufacturer_SKU || 'EMPTY'}"${savedProduct.Manufacturer_SKU ? ' ✅' : ' ❌'}`);
          console.log(`  RSR_Stock_Number: "${savedProduct.RSR_Stock_Number || 'EMPTY'}"${savedProduct.RSR_Stock_Number ? ' ✅' : ' ❌'}`);
          console.log(`  Manufacturer: "${savedProduct.Manufacturer || 'EMPTY'}"`);
          
          if (savedProduct.Manufacturer_SKU && savedProduct.RSR_Stock_Number) {
            console.log('\n🎉 SUCCESS: Custom fields working!');
            console.log('');
            console.log('📝 FIELD MAPPING SOLUTION:');
            console.log('  Use Manufacturer_SKU instead of Product_Code');
            console.log('  Use RSR_Stock_Number instead of Distributor_Part_Number');
            console.log('');
            console.log('🔧 Code changes needed:');
            console.log('  - Update mapping from Product_Code to Manufacturer_SKU');
            console.log('  - Update mapping from Distributor_Part_Number to RSR_Stock_Number');
          } else {
            console.log('\n❌ Custom fields not working properly');
          }
        }
      }, 3000);
    }
    
  } catch (error) {
    console.log('❌ Field fix failed:', error.message);
  }
}

fixFieldMapping();