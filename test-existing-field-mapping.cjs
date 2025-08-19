// Test using existing fields for Product_Code mapping
console.log('🧪 Testing existing field mapping solutions');

async function testExistingFields() {
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
    
    // Get a real RSR product to test with
    const productResponse = await fetch('http://localhost:5000/api/products/search?q=sight&limit=1');
    const products = await productResponse.json();
    
    if (products.length === 0) {
      throw new Error('No products found');
    }
    
    const product = products[0];
    console.log('📦 Using real RSR product:');
    console.log(`  Name: ${product.name}`);
    console.log(`  SKU: ${product.sku}`);
    console.log(`  RSR Stock: ${product.rsrStockNumber}`);
    
    // Test 1: Using Product_Code1 field (which exists but might be formula)
    console.log('\n🧪 Test 1: Using Product_Code1 field...');
    
    const test1Payload = {
      Product_Name: `Test SKU Mapping: ${product.name}`,
      Product_Code1: product.sku, // Try setting the formula field
      Manufacturer: product.manufacturer || 'Unknown'
    };
    
    console.log('📤 Test 1 payload:', JSON.stringify(test1Payload, null, 2));
    
    const test1Response = await fetch('https://www.zohoapis.com/crm/v2/Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: [test1Payload] })
    });
    
    const test1Result = await test1Response.json();
    console.log('📥 Test 1 result:', JSON.stringify(test1Result, null, 2));
    
    // Test 2: Create a simple custom field without complex parameters
    console.log('\n🔧 Test 2: Creating simple custom field...');
    
    const simpleField = {
      fields: [{
        api_name: 'Mfg_Part_Number',
        field_label: 'Mfg Part Number',
        data_type: 'text',
        length: 100
      }]
    };
    
    const fieldResponse = await fetch('https://www.zohoapis.com/crm/v2/settings/fields?module=Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(simpleField)
    });
    
    const fieldResult = await fieldResponse.json();
    console.log('📤 Simple field creation:', JSON.stringify(fieldResult, null, 2));
    
    // Wait and test the new field
    console.log('\n⏳ Waiting for field to be available...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const test2Payload = {
      Product_Name: `SKU Field Test: ${product.name}`,
      Mfg_Part_Number: product.sku, // Use new custom field
      Manufacturer: product.manufacturer || 'Unknown'
    };
    
    console.log('📤 Test 2 payload:', JSON.stringify(test2Payload, null, 2));
    
    const test2Response = await fetch('https://www.zohoapis.com/crm/v2/Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: [test2Payload] })
    });
    
    const test2Result = await test2Response.json();
    console.log('📥 Test 2 result:', JSON.stringify(test2Result, null, 2));
    
    if (test2Result.data && test2Result.data[0] && test2Result.data[0].status === 'success') {
      const productId = test2Result.data[0].details.id;
      console.log(`✅ Test product created: ${productId}`);
      
      // Verify the field
      setTimeout(async () => {
        console.log('\n🔍 Verifying Mfg_Part_Number field...');
        
        const verifyResponse = await fetch(`https://www.zohoapis.com/crm/v2/Products/${productId}?fields=Product_Name,Mfg_Part_Number,Manufacturer`, {
          headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
        });
        
        const verifyData = await verifyResponse.json();
        
        if (verifyData.data && verifyData.data[0]) {
          const savedProduct = verifyData.data[0];
          console.log('📋 Field verification:');
          console.log(`  Product_Name: "${savedProduct.Product_Name || 'EMPTY'}"`);
          console.log(`  Mfg_Part_Number: "${savedProduct.Mfg_Part_Number || 'EMPTY'}"${savedProduct.Mfg_Part_Number ? ' ✅' : ' ❌'}`);
          console.log(`  Manufacturer: "${savedProduct.Manufacturer || 'EMPTY'}"`);
          
          if (savedProduct.Mfg_Part_Number === product.sku) {
            console.log('\n🎉 BREAKTHROUGH: Mfg_Part_Number field working!');
            console.log('');
            console.log('✅ SOLUTION FOUND:');
            console.log('  - Use Mfg_Part_Number instead of Product_Code');
            console.log('  - This field successfully stores manufacturer SKUs');
            console.log('  - Field accepts values via API and saves correctly');
            console.log('');
            console.log('🔧 Next step: Update code to use Mfg_Part_Number field');
          } else if (savedProduct.Mfg_Part_Number) {
            console.log(`\n⚠️  Field populated but with wrong value: ${savedProduct.Mfg_Part_Number}`);
          } else {
            console.log('\n❌ Field still empty after creation');
          }
        }
      }, 2000);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testExistingFields();