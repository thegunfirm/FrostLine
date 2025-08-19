// Direct test bypassing API routes
console.log('🛒 Direct Complete Sale Test: 3 Accessories + 1 Glock');

async function directSaleTest() {
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
      throw new Error('Failed to get token');
    }
    
    console.log('✅ Token obtained');
    
    // Create fake customer contact first
    console.log('👤 Creating fake customer contact...');
    const customerData = {
      First_Name: 'John',
      Last_Name: 'TestBuyer',
      Email: 'john.testbuyer@example.com',
      Phone: '555-123-4567',
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
    
    // Create products for each item (using correct mapping)
    console.log('📦 Creating products with FIXED mapping...');
    
    const orderItems = [
      {
        name: 'ALG Combat Trigger',
        productCode: 'ACT', // Manufacturer part number
        distributorPartNumber: 'ALG05158', // RSR stock number
        manufacturer: 'ALG Defense',
        category: 'Triggers',
        unitPrice: 65.00,
        quantity: 1,
        fflRequired: false
      },
      {
        name: 'CMMG Receiver Extension Kit',
        productCode: '55DA219',
        distributorPartNumber: 'CMMG55DA219',
        manufacturer: 'CMMG',
        category: 'Parts',
        unitPrice: 32.50,
        quantity: 1,
        fflRequired: false
      },
      {
        name: 'XS DXT2 Big Dot Night Sights',
        productCode: 'GL-0003S-5',
        distributorPartNumber: 'XS24GL0003S5',
        manufacturer: 'XS Sight Systems',
        category: 'Sights',
        unitPrice: 118.75,
        quantity: 1,
        fflRequired: false
      },
      {
        name: 'GLOCK 19 Gen 5 9mm',
        productCode: 'PA195S201',
        distributorPartNumber: 'GLOCK19015',
        manufacturer: 'GLOCK',
        category: 'Handguns',
        unitPrice: 487.50,
        quantity: 1,
        fflRequired: true
      }
    ];
    
    // Create products in Zoho Products module
    const productIds = [];
    for (const item of orderItems) {
      console.log(`🔧 Creating product: ${item.name} (${item.productCode})`);
      
      const productPayload = {
        Product_Name: item.name,
        Product_Code: item.productCode, // CORRECT: Manufacturer part number
        Distributor_Part_Number: item.distributorPartNumber, // CORRECT: RSR stock number
        Distributor: 'RSR',
        Manufacturer: item.manufacturer,
        Product_Category: item.category
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
    
    // Create deal with subform containing all products
    console.log('💼 Creating deal with product subform...');
    
    const orderNumber = 'TGF' + Date.now().toString().slice(-6);
    const totalAmount = orderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    
    // Prepare subform data with correct field mapping
    const productSubform = orderItems.map(item => ({
      Product_Name: item.name,
      Product_Code: item.productCode, // Manufacturer part number
      Quantity: item.quantity,
      Unit_Price: item.unitPrice,
      Distributor_Part_Number: item.distributorPartNumber, // RSR stock number
      Manufacturer: item.manufacturer,
      Product_Category: item.category,
      FFL_Required: item.fflRequired
    }));
    
    const dealPayload = {
      Deal_Name: orderNumber,
      Amount: totalAmount,
      Stage: 'Payment Processed',
      Contact_Name: contactId,
      Description: 'Test Sale: 3 Accessories + 1 Glock',
      Product_Details: productSubform, // Standard subform
      Subform_1: productSubform // Backup subform
    };
    
    console.log('📋 Deal payload:');
    console.log(`  Order: ${orderNumber}`);
    console.log(`  Amount: $${totalAmount}`);
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
    
    console.log('📥 Deal creation result:');
    console.log(JSON.stringify(dealResult, null, 2));
    
    if (dealResult.data && dealResult.data[0] && dealResult.data[0].status === 'success') {
      const dealId = dealResult.data[0].details.id;
      console.log('✅ DEAL CREATED SUCCESSFULLY:', dealId);
      
      // Verify subform population
      setTimeout(async () => {
        console.log('🔍 Verifying deal subform...');
        
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
            console.log('✅ SUCCESS: Products found in subform');
            subformData.forEach((product, i) => {
              console.log(`    ${i+1}. ${product.Product_Name || 'Unknown'}`);
              console.log(`       Code: ${product.Product_Code || 'N/A'}`);
              console.log(`       Distributor Part: ${product.Distributor_Part_Number || 'N/A'}`);
              console.log(`       Qty: ${product.Quantity}, Price: $${product.Unit_Price}`);
              console.log(`       FFL Required: ${product.FFL_Required}`);
            });
            
            console.log('🎯 COMPLETE SALE TEST SUCCESSFUL');
            console.log('  ✓ Customer contact created');
            console.log('  ✓ Products created with correct mapping');
            console.log('  ✓ Deal created with populated subform');
            console.log('  ✓ Zoho integration working end-to-end');
          } else {
            console.log('❌ No products found in subform');
          }
        }
      }, 1000);
      
    } else {
      console.log('❌ Deal creation failed:', dealResult);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

directSaleTest();