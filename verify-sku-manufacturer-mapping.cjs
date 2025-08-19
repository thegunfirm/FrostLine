// Verify the updated SKU-to-manufacturer field mapping is working
console.log('🧪 Verifying SKU-to-manufacturer field mapping');

async function verifyMapping() {
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
    const productResponse = await fetch('http://localhost:5000/api/products/search?q=glock&limit=1');
    const products = await productResponse.json();
    
    if (products.length === 0) {
      throw new Error('No products found');
    }
    
    const product = products[0];
    console.log('📦 Testing with real RSR product:');
    console.log(`  Name: ${product.name}`);
    console.log(`  SKU: ${product.sku}`);
    console.log(`  RSR Stock: ${product.rsrStockNumber}`);
    console.log(`  Manufacturer: ${product.manufacturer}`);
    
    // Test with corrected field mapping
    const testProductPayload = {
      Product_Name: `FINAL MAPPING TEST: ${product.name}`,
      Mfg_Part_Number: product.sku, // Manufacturer part number - CORRECTED FIELD
      RSR_Stock_Number: product.rsrStockNumber, // RSR stock number - CORRECTED FIELD
      Manufacturer: product.manufacturer || 'Unknown',
      Product_Category: product.category || 'Test Category'
    };
    
    console.log('\n📤 Test payload with corrected field mapping:');
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
    console.log('\n📥 Product creation result:', JSON.stringify(testResult, null, 2));
    
    if (testResult.data && testResult.data[0] && testResult.data[0].status === 'success') {
      const productId = testResult.data[0].details.id;
      console.log(`✅ Test product created: ${productId}`);
      
      // Verify the fields were saved correctly
      setTimeout(async () => {
        console.log('\n🔍 Verifying final field mapping...');
        
        const verifyResponse = await fetch(`https://www.zohoapis.com/crm/v2/Products/${productId}?fields=Product_Name,Mfg_Part_Number,RSR_Stock_Number,Manufacturer,Product_Category`, {
          headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
        });
        
        const verifyData = await verifyResponse.json();
        
        if (verifyData.data && verifyData.data[0]) {
          const savedProduct = verifyData.data[0];
          console.log('📋 Final field verification:');
          console.log(`  Product_Name: "${savedProduct.Product_Name || 'EMPTY'}"`);
          console.log(`  Mfg_Part_Number: "${savedProduct.Mfg_Part_Number || 'EMPTY'}"${savedProduct.Mfg_Part_Number === product.sku ? ' ✅' : ' ❌'}`);
          console.log(`  RSR_Stock_Number: "${savedProduct.RSR_Stock_Number || 'EMPTY'}"${savedProduct.RSR_Stock_Number === product.rsrStockNumber ? ' ✅' : ' ❌'}`);
          console.log(`  Manufacturer: "${savedProduct.Manufacturer || 'EMPTY'}"${savedProduct.Manufacturer === product.manufacturer ? ' ✅' : ' ❌'}`);
          console.log(`  Product_Category: "${savedProduct.Product_Category || 'EMPTY'}"`);
          
          if (savedProduct.Mfg_Part_Number === product.sku && savedProduct.RSR_Stock_Number === product.rsrStockNumber) {
            console.log('\n🎉 FIELD MAPPING SUCCESS!');
            console.log('');
            console.log('✅ VERIFICATION COMPLETE:');
            console.log('  ✓ Mfg_Part_Number field correctly stores manufacturer SKU');
            console.log('  ✓ RSR_Stock_Number field correctly stores RSR stock number');
            console.log('  ✓ Both fields accept values via API and save correctly');
            console.log('  ✓ Code can be updated to use these working field names');
            console.log('');
            console.log('🔧 NEXT STEPS:');
            console.log('  1. Update all code references from Product_Code to Mfg_Part_Number');
            console.log('  2. Update all code references from Distributor_Part_Number to RSR_Stock_Number');
            console.log('  3. Run complete end-to-end integration test');
          } else {
            console.log('\n❌ Field values don\'t match expected data');
            console.log(`Expected SKU: ${product.sku}, Got: ${savedProduct.Mfg_Part_Number}`);
            console.log(`Expected RSR Stock: ${product.rsrStockNumber}, Got: ${savedProduct.RSR_Stock_Number}`);
          }
        }
      }, 2000);
    } else {
      console.log('❌ Product creation failed');
      if (testResult.data && testResult.data[0] && testResult.data[0].message) {
        console.log(`Error: ${testResult.data[0].message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Verification failed:', error.message);
  }
}

verifyMapping();