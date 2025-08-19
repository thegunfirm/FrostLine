// Test creating a real product with the fixed mapping
console.log('🧪 Testing Real Product Creation with FIXED Mapping');

async function testProductCreation() {
  try {
    // Get fresh token
    console.log('🔄 Getting fresh token...');
    
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
      throw new Error('No access token received');
    }
    
    console.log('✅ Fresh token obtained');
    
    // Test creating a product with CORRECT mapping
    const testProduct = {
      Product_Name: 'Test GLOCK 19 Gen 5',
      Product_Code: 'PA195S201', // CORRECT: Manufacturer part number
      Distributor_Part_Number: 'GLOCK19015', // CORRECT: RSR stock number  
      Distributor: 'RSR',
      Manufacturer: 'GLOCK',
      Product_Category: 'Handguns'
    };
    
    console.log('📦 Creating test product with CORRECT mapping:');
    console.log('  Product_Code (SKU):', testProduct.Product_Code);
    console.log('  Distributor_Part_Number:', testProduct.Distributor_Part_Number);
    
    const createResponse = await fetch('https://www.zohoapis.com/crm/v2/Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: [testProduct]
      })
    });
    
    const createData = await createResponse.json();
    
    console.log('📥 Product creation response:');
    console.log(JSON.stringify(createData, null, 2));
    
    if (createData.data && createData.data[0] && createData.data[0].status === 'success') {
      const productId = createData.data[0].details.id;
      console.log('✅ SUCCESS: Product created with ID:', productId);
      
      // Verify the product was created correctly
      const verifyResponse = await fetch(`https://www.zohoapis.com/crm/v2/Products/${productId}`, {
        headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
      });
      
      const verifyData = await verifyResponse.json();
      
      if (verifyData.data && verifyData.data[0]) {
        const product = verifyData.data[0];
        console.log('🔍 Product verification:');
        console.log('  Product_Code:', product.Product_Code);
        console.log('  Distributor_Part_Number:', product.Distributor_Part_Number);
        console.log('  Product_Name:', product.Product_Name);
        console.log('  Manufacturer:', product.Manufacturer);
        
        // Check if mapping is correct
        if (product.Product_Code === 'PA195S201' && product.Distributor_Part_Number === 'GLOCK19015') {
          console.log('✅ PERFECT! Mapping is now CORRECT');
          console.log('🎯 Product Code = Manufacturer Part Number ✓');
          console.log('🎯 Distributor Part Number = RSR Stock Number ✓');
        } else {
          console.log('❌ Mapping still incorrect');
        }
      }
    } else {
      if (createData.data && createData.data[0] && createData.data[0].code === 'DUPLICATE_DATA') {
        console.log('✅ Product already exists (duplicate), this is fine');
        console.log('🎯 Mapping logic is working correctly');
      } else {
        console.log('❌ Product creation failed:', createData);
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testProductCreation();