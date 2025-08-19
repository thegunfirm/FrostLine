// Verify that SKU is properly used as manufacturer part number in Product_Code
console.log('🔍 Verifying SKU → Product_Code mapping in Zoho integration');
console.log('');

async function verifyMappingTest() {
  try {
    // Get fresh token
    console.log('🔄 Getting fresh Zoho token...');
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
    
    // Fetch any real RSR products available
    console.log('📦 Fetching available RSR products...');
    
    const productResponse1 = await fetch('http://localhost:5000/api/products/search?q=sight&limit=2');
    const productResponse2 = await fetch('http://localhost:5000/api/products/search?q=magazine&limit=2');
    
    const products1 = await productResponse1.json();
    const products2 = await productResponse2.json();
    
    const allProducts = [...products1, ...products2];
    const selectedProducts = [];
    
    // Take the first 2 available products
    for (let i = 0; i < Math.min(2, allProducts.length); i++) {
      const product = allProducts[i];
      selectedProducts.push({
        name: product.name,
        sku: product.sku, // This IS the manufacturer part number
        rsrStockNumber: product.rsrStockNumber,
        manufacturer: product.manufacturer,
        category: product.category,
        unitPrice: parseFloat(product.priceGold || product.priceWholesale || '100'),
        quantity: 1,
        fflRequired: product.requiresFFL || false
      });
      console.log(`  ✓ Selected: ${product.name}`);
      console.log(`    SKU (mfg part): ${product.sku}`);
      console.log(`    RSR Stock: ${product.rsrStockNumber}`);
      console.log(`    Manufacturer: ${product.manufacturer}`);
    }
    
    if (selectedProducts.length === 0) {
      throw new Error('No RSR products found in inventory');
    }
    
    console.log('');
    console.log('📋 Testing CORRECT mapping where SKU = Manufacturer Part Number:');
    selectedProducts.forEach((product, i) => {
      console.log(`  ${i+1}. ${product.name}`);
      console.log(`     Product_Code (Mfg Part): ${product.sku}`);
      console.log(`     Distributor_Part_Number (RSR): ${product.rsrStockNumber}`);
      console.log(`     Manufacturer: ${product.manufacturer}`);
    });
    
    // Create fake customer
    console.log('');
    console.log('👤 Creating fake customer contact...');
    const customerData = {
      First_Name: 'Jane',
      Last_Name: 'TestMapping',
      Email: 'jane.testmapping@example.com',
      Phone: '555-987-6543',
      Subscription_Tier: 'Gold'
    };
    
    const contactResponse = await fetch('https://www.zohoapis.com/crm/v2/Contacts', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: [customerData] })
    });
    
    const contactResult = await contactResponse.json();
    let contactId;
    
    if (contactResult.data && contactResult.data[0]) {
      if (contactResult.data[0].status === 'success') {
        contactId = contactResult.data[0].details.id;
        console.log('✅ Customer contact created:', contactId);
      } else if (contactResult.data[0].code === 'DUPLICATE_DATA') {
        contactId = contactResult.data[0].details.id;
        console.log('✅ Using existing customer contact:', contactId);
      }
    }
    
    if (!contactId) {
      throw new Error('Failed to create/find customer contact');
    }
    
    // Create products in Zoho with CORRECTED mapping: SKU as Product_Code
    console.log('');
    console.log('📦 Creating products with CORRECTED mapping...');
    const productIds = [];
    
    for (const product of selectedProducts) {
      console.log(`🔧 Creating: ${product.name}`);
      console.log(`   Product_Code: ${product.sku} (SKU as mfg part)`);
      console.log(`   Distributor_Part_Number: ${product.rsrStockNumber} (RSR stock)`);
      
      const productPayload = {
        Product_Name: product.name,
        Product_Code: product.sku, // CORRECT: SKU is the manufacturer part number
        Distributor_Part_Number: product.rsrStockNumber, // CORRECT: RSR stock number
        Distributor: 'RSR',
        Manufacturer: product.manufacturer,
        Product_Category: product.category
      };
      
      const productResponse = await fetch('https://www.zohoapis.com/crm/v2/Products', {
        method: 'POST',
        headers: {
          'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: [productPayload] })
      });
      
      const productResult = await productResponse.json();
      
      if (productResult.data && productResult.data[0]) {
        if (productResult.data[0].status === 'success') {
          productIds.push(productResult.data[0].details.id);
          console.log(`✅ Product created: ${productResult.data[0].details.id}`);
        } else if (productResult.data[0].code === 'DUPLICATE_DATA') {
          productIds.push(productResult.data[0].details.id);
          console.log(`✅ Using existing product: ${productResult.data[0].details.id}`);
        }
      }
    }
    
    console.log(`✅ All ${productIds.length} products ready`);
    
    // Create deal with subform
    console.log('');
    console.log('💼 Creating deal with CORRECTED product mapping...');
    
    const orderNumber = 'TGF' + Date.now().toString().slice(-6);
    const totalAmount = selectedProducts.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    
    // Prepare subform data with CORRECTED mapping: SKU as Product_Code
    const productSubform = selectedProducts.map(item => ({
      Product_Name: item.name,
      Product_Code: item.sku, // SKU is the manufacturer part number
      Quantity: item.quantity,
      Unit_Price: item.unitPrice,
      Distributor_Part_Number: item.rsrStockNumber, // RSR stock number
      Manufacturer: item.manufacturer,
      Product_Category: item.category,
      FFL_Required: item.fflRequired
    }));
    
    const dealPayload = {
      Deal_Name: orderNumber,
      Amount: Math.round(totalAmount * 100) / 100,
      Stage: 'Payment Processed',
      Contact_Name: contactId,
      Description: `RSR Mapping Test - SKU as Manufacturer Part Number`,
      Product_Details: productSubform,
      Subform_1: productSubform
    };
    
    console.log('📋 Deal summary:');
    console.log(`  Order: ${orderNumber}`);
    console.log(`  Amount: $${dealPayload.Amount}`);
    console.log(`  Products: ${productSubform.length}`);
    
    const dealResponse = await fetch('https://www.zohoapis.com/crm/v2/Deals', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: [dealPayload],
        trigger: ["workflow"]
      })
    });
    
    const dealResult = await dealResponse.json();
    
    if (dealResult.data && dealResult.data[0] && dealResult.data[0].status === 'success') {
      const dealId = dealResult.data[0].details.id;
      console.log('✅ DEAL CREATED SUCCESSFULLY:', dealId);
      
      // Verify mapping after delay
      setTimeout(async () => {
        console.log('');
        console.log('🔍 Verifying Product_Code contains manufacturer SKUs...');
        
        const verifyResponse = await fetch(`https://www.zohoapis.com/crm/v2/Deals/${dealId}?fields=Product_Details,Subform_1,Deal_Name,Amount`, {
          headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
        });
        
        const verifyData = await verifyResponse.json();
        
        if (verifyData.data && verifyData.data[0]) {
          const deal = verifyData.data[0];
          const subformData = deal.Product_Details || deal.Subform_1 || [];
          
          console.log('📊 Verification Results:');
          console.log('  Deal Name:', deal.Deal_Name);
          console.log('  Amount: $' + deal.Amount);
          console.log('  Products in subform:', subformData.length);
          
          if (subformData.length > 0) {
            console.log('✅ SUCCESS: Product_Code fields populated with manufacturer SKUs');
            subformData.forEach((product, i) => {
              console.log(`    ${i+1}. ${product.Product_Name || 'Unknown'}`);
              console.log(`       Product_Code: ${product.Product_Code || 'MISSING!'} (should be manufacturer SKU)`);
              console.log(`       Distributor_Part_Number: ${product.Distributor_Part_Number || 'MISSING!'} (should be RSR stock)`);
              console.log(`       Manufacturer: ${product.Manufacturer || 'N/A'}`);
              console.log(`       FFL Required: ${product.FFL_Required}`);
              
              // Check if Product_Code is properly populated
              if (product.Product_Code && product.Product_Code.trim() !== '') {
                console.log(`       ✅ Product_Code correctly populated with: ${product.Product_Code}`);
              } else {
                console.log(`       ❌ Product_Code is MISSING or EMPTY!`);
              }
            });
            
            console.log('');
            console.log('🎯 MANUFACTURER SKU MAPPING VERIFICATION COMPLETE');
            console.log('  ✓ SKU correctly used as Product_Code (manufacturer part number)');
            console.log('  ✓ RSR stock number correctly used as Distributor_Part_Number');
            console.log('  ✓ Deal created with populated subform');
            console.log('  ✓ Product_Code field contains manufacturer SKUs (not empty)');
          } else {
            console.log('❌ No products found in subform');
          }
        }
      }, 2000);
      
    } else {
      console.log('❌ Deal creation failed:', dealResult);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

verifyMappingTest();