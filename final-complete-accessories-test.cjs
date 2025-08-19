// Complete accessories test with corrected field mapping
console.log('🧪 Complete accessories test with corrected Mfg_Part_Number and RSR_Stock_Number fields');

async function runCompleteTest() {
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
    
    // Create test order with accessories
    const testOrderPayload = {
      customerId: 'test_customer_123',
      items: [
        {
          sku: 'XSSI-R203P-6G', // XS sights - real RSR product
          quantity: 1,
          unitPrice: 89.99
        }
      ],
      shipping: {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
        address: '123 Test St',
        city: 'Test City',
        state: 'TX',
        zipCode: '12345'
      },
      billingInfo: {
        firstName: 'Test',
        lastName: 'Customer',
        address: '123 Test St',
        city: 'Test City',
        state: 'TX',
        zipCode: '12345'
      },
      paymentMethod: {
        type: 'credit_card',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123'
      }
    };

    console.log('\n📤 Creating test accessories order...');
    console.log('  Product: XS R3D 2.0 Sight (Accessories - No FFL Required)');
    console.log('  SKU: XSSI-R203P-6G');
    console.log('  Quantity: 1');
    console.log('  Price: $89.99');

    // Submit order to the API
    const orderResponse = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOrderPayload)
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      throw new Error(`Order creation failed: ${orderResponse.status} ${errorText}`);
    }

    const orderResult = await orderResponse.json();
    console.log('\n📥 Order creation result:');
    console.log(JSON.stringify(orderResult, null, 2));

    if (orderResult.orderId) {
      console.log(`✅ Order created successfully: ${orderResult.orderId}`);
      
      // Wait a moment for Zoho processing
      console.log('\n⏳ Waiting for Zoho integration to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      if (orderResult.zoho?.dealId) {
        const dealId = orderResult.zoho.dealId;
        console.log(`\n🔍 Verifying Zoho Deal: ${dealId}`);
        
        // Verify the deal in Zoho CRM
        const dealResponse = await fetch(`https://www.zohoapis.com/crm/v2/Deals/${dealId}?fields=Deal_Name,Amount,TGF_Order,Order_Status,Fulfillment_Type,Products`, {
          headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
        });
        
        const dealData = await dealResponse.json();
        console.log('\n📋 Zoho Deal verification:');
        console.log(JSON.stringify(dealData, null, 2));
        
        if (dealData.data && dealData.data[0]) {
          const deal = dealData.data[0];
          console.log('\n✅ Deal Fields Verification:');
          console.log(`  Deal_Name: "${deal.Deal_Name}"`);
          console.log(`  Amount: $${deal.Amount}`);
          console.log(`  TGF_Order: "${deal.TGF_Order}"`);
          console.log(`  Order_Status: "${deal.Order_Status}"`);
          console.log(`  Fulfillment_Type: "${deal.Fulfillment_Type}"`);
          
          // Check for subform/products
          if (deal.Products && deal.Products.length > 0) {
            console.log('\n🎯 Products Subform Verification:');
            deal.Products.forEach((product, index) => {
              console.log(`  Product ${index + 1}:`);
              console.log(`    Name: "${product.Product_Name || 'N/A'}"`);
              console.log(`    Mfg_Part_Number: "${product.Mfg_Part_Number || 'N/A'}"${product.Mfg_Part_Number === 'XSSI-R203P-6G' ? ' ✅' : ' ❌'}`);
              console.log(`    RSR_Stock_Number: "${product.RSR_Stock_Number || 'N/A'}"${product.RSR_Stock_Number === 'XSSI-R203P-6G' ? ' ✅' : ' ❌'}`);
              console.log(`    Quantity: ${product.Quantity || 'N/A'}`);
              console.log(`    Unit_Price: $${product.Unit_Price || 'N/A'}`);
            });
            
            // Check if our corrected field mapping is working
            const product = deal.Products[0];
            if (product.Mfg_Part_Number === 'XSSI-R203P-6G' && product.RSR_Stock_Number === 'XSSI-R203P-6G') {
              console.log('\n🎉 FIELD MAPPING SUCCESS!');
              console.log('✅ CORRECTED FIELD MAPPING VERIFIED:');
              console.log('  ✓ Mfg_Part_Number correctly stores manufacturer SKU');
              console.log('  ✓ RSR_Stock_Number correctly stores RSR stock number');
              console.log('  ✓ End-to-end integration working with corrected fields');
              console.log('  ✓ Real RSR product successfully processed');
              console.log('  ✓ Zoho Deal created with populated subform');
            } else {
              console.log('\n⚠️  Field mapping issues detected:');
              console.log(`  Expected Mfg_Part_Number: XSSI-R203P-6G, Got: ${product.Mfg_Part_Number}`);
              console.log(`  Expected RSR_Stock_Number: XSSI-R203P-6G, Got: ${product.RSR_Stock_Number}`);
            }
          } else {
            console.log('\n❌ No products found in subform');
          }
        }
      } else {
        console.log('\n⚠️  Order created but no Zoho Deal ID returned');
      }
    } else {
      console.log('\n❌ Order creation failed');
    }
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.log('Stack:', error.stack);
  }
}

runCompleteTest();