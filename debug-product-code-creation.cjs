// Debug why Product_Code is not being set in Zoho records
console.log('🐛 Debugging Product_Code creation in Zoho');

async function debugProductCreation() {
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
    
    // Get one real RSR product
    console.log('📦 Getting a real RSR product...');
    const productResponse = await fetch('http://localhost:5000/api/products/search?q=sight&limit=1');
    const products = await productResponse.json();
    
    if (products.length === 0) {
      throw new Error('No products found');
    }
    
    const product = products[0];
    console.log('🔍 Selected product:');
    console.log(`  Name: ${product.name}`);
    console.log(`  SKU: ${product.sku} (this should be Product_Code)`);
    console.log(`  RSR Stock: ${product.rsrStockNumber} (this should be Distributor_Part_Number)`);
    console.log(`  Manufacturer: ${product.manufacturer}`);
    
    // Create product with explicit logging
    console.log('\n🔧 Creating product with explicit Product_Code mapping...');
    
    const productPayload = {
      Product_Name: product.name,
      Product_Code: product.sku, // Explicitly set this
      Distributor_Part_Number: product.rsrStockNumber, // Explicitly set this
      Distributor: 'RSR',
      Manufacturer: product.manufacturer || 'Unknown',
      Product_Category: product.category || 'General'
    };
    
    console.log('📤 Payload being sent to Zoho:');
    console.log(JSON.stringify(productPayload, null, 2));
    
    const createResponse = await fetch('https://www.zohoapis.com/crm/v2/Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        data: [productPayload],
        trigger: ["workflow"]
      })
    });
    
    const createResult = await createResponse.json();
    console.log('\n📥 Zoho response:');
    console.log(JSON.stringify(createResult, null, 2));
    
    if (createResult.data && createResult.data[0]) {
      const result = createResult.data[0];
      if (result.status === 'success' || result.code === 'DUPLICATE_DATA') {
        const productId = result.details.id;
        console.log(`✅ Product created/found: ${productId}`);
        
        // Now fetch the product back to see what actually got saved
        console.log('\n🔍 Fetching product back to verify what was saved...');
        
        setTimeout(async () => {
          try {
            const fetchResponse = await fetch(`https://www.zohoapis.com/crm/v2/Products/${productId}?fields=Product_Name,Product_Code,Distributor_Part_Number,Manufacturer,Product_Category`, {
              headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
            });
            
            const fetchData = await fetchResponse.json();
            
            if (fetchData.data && fetchData.data[0]) {
              const savedProduct = fetchData.data[0];
              console.log('📋 What was actually saved in Zoho:');
              console.log(`  Product_Name: "${savedProduct.Product_Name || 'EMPTY'}"`);
              console.log(`  Product_Code: "${savedProduct.Product_Code || 'EMPTY'}"${savedProduct.Product_Code ? ' ✅' : ' ❌'}`);
              console.log(`  Distributor_Part_Number: "${savedProduct.Distributor_Part_Number || 'EMPTY'}"${savedProduct.Distributor_Part_Number ? ' ✅' : ' ❌'}`);
              console.log(`  Manufacturer: "${savedProduct.Manufacturer || 'EMPTY'}"`);
              console.log(`  Product_Category: "${savedProduct.Product_Category || 'EMPTY'}"`);
              
              // Compare what we sent vs what was saved
              console.log('\n🔍 Comparison:');
              console.log(`  Product_Code - Sent: "${productPayload.Product_Code}" | Saved: "${savedProduct.Product_Code || 'EMPTY'}"`);
              console.log(`  Distributor_Part_Number - Sent: "${productPayload.Distributor_Part_Number}" | Saved: "${savedProduct.Distributor_Part_Number || 'EMPTY'}"`);
              
              if (savedProduct.Product_Code !== productPayload.Product_Code) {
                console.log('❌ MISMATCH: Product_Code was not saved correctly!');
                console.log('   This indicates a field mapping or permission issue in Zoho');
              } else {
                console.log('✅ Product_Code saved correctly');
              }
              
              if (savedProduct.Distributor_Part_Number !== productPayload.Distributor_Part_Number) {
                console.log('❌ MISMATCH: Distributor_Part_Number was not saved correctly!');
              } else {
                console.log('✅ Distributor_Part_Number saved correctly');
              }
            }
          } catch (fetchError) {
            console.log('❌ Error fetching product back:', fetchError.message);
          }
        }, 2000);
        
      } else {
        console.log('❌ Product creation failed:', result);
      }
    }
    
  } catch (error) {
    console.log('❌ Debug failed:', error.message);
  }
}

debugProductCreation();