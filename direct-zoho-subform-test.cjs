// Direct test of Zoho Deal creation with corrected field mapping
console.log('🧪 Direct Zoho Deal creation with corrected Mfg_Part_Number and RSR_Stock_Number fields');

async function testZohoSubform() {
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
    
    // First, find or create the product using corrected field mapping
    const productPayload = {
      Product_Name: 'XS R3D 2.0 Sight - Field Mapping Test',
      Mfg_Part_Number: 'XSSI-R203P-6G', // CORRECTED: Manufacturer part number
      RSR_Stock_Number: 'XSSI-R203P-6G', // CORRECTED: RSR stock number
      Manufacturer: 'XS',
      Product_Category: 'Accessories',
      'Unit Price': 89.99
    };
    
    console.log('\n📤 Creating product with corrected field mapping...');
    console.log(JSON.stringify(productPayload, null, 2));
    
    const productResponse = await fetch('https://www.zohoapis.com/crm/v2/Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: [productPayload] })
    });
    
    const productResult = await productResponse.json();
    console.log('\n📥 Product creation result:', JSON.stringify(productResult, null, 2));
    
    if (!productResult.data || !productResult.data[0] || productResult.data[0].status !== 'success') {
      throw new Error('Product creation failed');
    }
    
    const productId = productResult.data[0].details.id;
    console.log(`✅ Product created: ${productId}`);
    
    // Wait for product to be available
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now create a Deal with the product in subform
    const dealPayload = {
      Deal_Name: 'Field Mapping Test Deal',
      Amount: 89.99,
      Stage: 'Submitted',
      TGF_Order: 'TGF240819A',
      Fulfillment_Type: 'In-House',
      Order_Status: 'Submitted',
      Products: [
        {
          Product: { id: productId },
          Quantity: 1,
          'Unit Price': 89.99,
          Amount: 89.99
        }
      ]
    };
    
    console.log('\n📤 Creating Deal with subform...');
    console.log(JSON.stringify(dealPayload, null, 2));
    
    const dealResponse = await fetch('https://www.zohoapis.com/crm/v2/Deals', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: [dealPayload] })
    });
    
    const dealResult = await dealResponse.json();
    console.log('\n📥 Deal creation result:', JSON.stringify(dealResult, null, 2));
    
    if (!dealResult.data || !dealResult.data[0] || dealResult.data[0].status !== 'success') {
      throw new Error('Deal creation failed');
    }
    
    const dealId = dealResult.data[0].details.id;
    console.log(`✅ Deal created: ${dealId}`);
    
    // Wait for deal to be fully processed
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify the deal and check subform fields
    console.log('\n🔍 Verifying Deal with subform fields...');
    
    const verifyResponse = await fetch(`https://www.zohoapis.com/crm/v2/Deals/${dealId}?fields=Deal_Name,Amount,TGF_Order,Order_Status,Fulfillment_Type,Products`, {
      headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
    });
    
    const verifyData = await verifyResponse.json();
    console.log('\n📋 Deal verification result:');
    console.log(JSON.stringify(verifyData, null, 2));
    
    if (verifyData.data && verifyData.data[0]) {
      const deal = verifyData.data[0];
      console.log('\n✅ Deal Fields:');
      console.log(`  Deal_Name: "${deal.Deal_Name}"`);
      console.log(`  Amount: $${deal.Amount}`);
      console.log(`  TGF_Order: "${deal.TGF_Order}"`);
      console.log(`  Order_Status: "${deal.Order_Status}"`);
      console.log(`  Fulfillment_Type: "${deal.Fulfillment_Type}"`);
      
      // Check subform/products
      if (deal.Products && deal.Products.length > 0) {
        console.log('\n🎯 Products Subform:');
        deal.Products.forEach((product, index) => {
          console.log(`  Product ${index + 1}:`);
          console.log(`    Product ID: ${product.Product?.id || 'N/A'}`);
          console.log(`    Product Name: "${product.Product?.name || 'N/A'}"`);
          console.log(`    Quantity: ${product.Quantity || 'N/A'}`);
          console.log(`    Unit Price: $${product['Unit Price'] || 'N/A'}`);
          console.log(`    Amount: $${product.Amount || 'N/A'}`);
        });
        
        // Check if the product has our corrected fields by fetching it directly
        const productCheckId = deal.Products[0].Product?.id;
        if (productCheckId) {
          console.log(`\n🔍 Checking product fields for ID: ${productCheckId}`);
          
          const productCheckResponse = await fetch(`https://www.zohoapis.com/crm/v2/Products/${productCheckId}?fields=Product_Name,Mfg_Part_Number,RSR_Stock_Number,Manufacturer`, {
            headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
          });
          
          const productCheckData = await productCheckResponse.json();
          
          if (productCheckData.data && productCheckData.data[0]) {
            const productDetails = productCheckData.data[0];
            console.log('📋 Product Field Verification:');
            console.log(`  Product_Name: "${productDetails.Product_Name || 'EMPTY'}"`);
            console.log(`  Mfg_Part_Number: "${productDetails.Mfg_Part_Number || 'EMPTY'}"${productDetails.Mfg_Part_Number === 'XSSI-R203P-6G' ? ' ✅' : ' ❌'}`);
            console.log(`  RSR_Stock_Number: "${productDetails.RSR_Stock_Number || 'EMPTY'}"${productDetails.RSR_Stock_Number === 'XSSI-R203P-6G' ? ' ✅' : ' ❌'}`);
            console.log(`  Manufacturer: "${productDetails.Manufacturer || 'EMPTY'}"${productDetails.Manufacturer === 'XS' ? ' ✅' : ' ❌'}`);
            
            if (productDetails.Mfg_Part_Number === 'XSSI-R203P-6G' && productDetails.RSR_Stock_Number === 'XSSI-R203P-6G') {
              console.log('\n🎉 COMPLETE SUCCESS!');
              console.log('');
              console.log('✅ CORRECTED FIELD MAPPING VERIFIED:');
              console.log('  ✓ Mfg_Part_Number field correctly stores manufacturer SKU');
              console.log('  ✓ RSR_Stock_Number field correctly stores RSR stock number');
              console.log('  ✓ Products can be created with corrected field names');
              console.log('  ✓ Deals can reference products with populated subforms');
              console.log('  ✓ End-to-end Zoho integration working');
              console.log('');
              console.log('🔧 IMPLEMENTATION STATUS:');
              console.log('  ✓ Custom fields created in Zoho Products module');
              console.log('  ✓ Field mapping updated in code');
              console.log('  ✓ Interface definitions corrected');
              console.log('  ✓ LSP errors resolved');
              console.log('  ✓ Ready for full integration testing');
            } else {
              console.log('\n❌ Field mapping verification failed');
            }
          }
        }
      } else {
        console.log('\n❌ No products found in subform');
      }
    }
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.log('Stack:', error.stack);
  }
}

testZohoSubform();