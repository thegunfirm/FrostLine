// Create the missing Product_Code and Distributor_Part_Number fields in Zoho Products module
console.log('🔧 Creating missing fields in Zoho Products module');

async function createMissingFields() {
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
    
    // Create Product_Code field (for manufacturer part number/SKU)
    console.log('\n🔧 Creating Product_Code field...');
    
    const productCodeField = {
      fields: [{
        api_name: 'Product_Code',
        display_label: 'Product Code',
        data_type: 'text',
        length: 100,
        required: false,
        unique: false,
        description: 'Manufacturer part number or SKU'
      }]
    };
    
    const productCodeResponse = await fetch('https://www.zohoapis.com/crm/v2/settings/fields?module=Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productCodeField)
    });
    
    const productCodeResult = await productCodeResponse.json();
    console.log('📤 Product_Code field creation response:');
    console.log(JSON.stringify(productCodeResult, null, 2));
    
    // Create Distributor_Part_Number field (for RSR stock number)
    console.log('\n🔧 Creating Distributor_Part_Number field...');
    
    const distributorField = {
      fields: [{
        api_name: 'Distributor_Part_Number',
        display_label: 'Distributor Part Number',
        data_type: 'text',
        length: 100,
        required: false,
        unique: false,
        description: 'RSR stock number or distributor part number'
      }]
    };
    
    const distributorResponse = await fetch('https://www.zohoapis.com/crm/v2/settings/fields?module=Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(distributorField)
    });
    
    const distributorResult = await distributorResponse.json();
    console.log('📤 Distributor_Part_Number field creation response:');
    console.log(JSON.stringify(distributorResult, null, 2));
    
    // Wait a moment for fields to be available
    console.log('\n⏳ Waiting for fields to become available...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test creating a product with the new fields
    console.log('\n🧪 Testing product creation with new fields...');
    
    const testProductPayload = {
      Product_Name: 'Test Product for Field Validation',
      Product_Code: 'TEST-SKU-123', // Manufacturer part number
      Distributor_Part_Number: 'RSR-TEST-456', // RSR stock number
      Manufacturer: 'Test Manufacturer',
      Product_Category: 'Test Category'
    };
    
    console.log('📤 Test payload:');
    console.log(JSON.stringify(testProductPayload, null, 2));
    
    const testResponse = await fetch('https://www.zohoapis.com/crm/v2/Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: [testProductPayload] })
    });
    
    const testResult = await testResponse.json();
    console.log('\n📥 Test product creation response:');
    console.log(JSON.stringify(testResult, null, 2));
    
    if (testResult.data && testResult.data[0] && testResult.data[0].status === 'success') {
      const testProductId = testResult.data[0].details.id;
      console.log(`✅ Test product created: ${testProductId}`);
      
      // Verify the fields were saved
      setTimeout(async () => {
        console.log('\n🔍 Verifying fields were saved...');
        
        const verifyResponse = await fetch(`https://www.zohoapis.com/crm/v2/Products/${testProductId}?fields=Product_Name,Product_Code,Distributor_Part_Number,Manufacturer`, {
          headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
        });
        
        const verifyData = await verifyResponse.json();
        
        if (verifyData.data && verifyData.data[0]) {
          const savedProduct = verifyData.data[0];
          console.log('📋 Verification results:');
          console.log(`  Product_Name: "${savedProduct.Product_Name || 'EMPTY'}"`);
          console.log(`  Product_Code: "${savedProduct.Product_Code || 'EMPTY'}"${savedProduct.Product_Code ? ' ✅' : ' ❌'}`);
          console.log(`  Distributor_Part_Number: "${savedProduct.Distributor_Part_Number || 'EMPTY'}"${savedProduct.Distributor_Part_Number ? ' ✅' : ' ❌'}`);
          console.log(`  Manufacturer: "${savedProduct.Manufacturer || 'EMPTY'}"`);
          
          if (savedProduct.Product_Code && savedProduct.Distributor_Part_Number) {
            console.log('\n🎉 SUCCESS: Fields created and working correctly!');
            console.log('  ✓ Product_Code field accepts manufacturer part numbers');
            console.log('  ✓ Distributor_Part_Number field accepts RSR stock numbers');
            console.log('  ✓ Both fields can be written to via API');
          } else {
            console.log('\n❌ ISSUE: Fields created but values not saved properly');
          }
        }
      }, 2000);
      
    } else {
      console.log('❌ Test product creation failed');
    }
    
  } catch (error) {
    console.log('❌ Field creation failed:', error.message);
  }
}

createMissingFields();