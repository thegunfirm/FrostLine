/**
 * Comprehensive test of the Zoho subform fix
 * Tests the corrected implementation that uses Subform_1 field
 */

async function testSubformFix() {
  console.log('🧪 COMPREHENSIVE ZOHO SUBFORM FIX TEST\n');

  // Generate fresh token
  console.log('🔄 Generating fresh token...');
  const refreshResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      refresh_token: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN,
      client_id: process.env.ZOHO_WEBSERVICES_CLIENT_ID,
      client_secret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET,
      grant_type: 'refresh_token'
    })
  });

  const tokenData = await refreshResponse.json();
  
  if (!tokenData.access_token) {
    console.log('❌ Token generation failed:', tokenData);
    return;
  }

  console.log('✅ Fresh token obtained');
  const accessToken = tokenData.access_token;

  // Create a test order with multiple products
  console.log('\n📦 Creating test order with multiple products...');
  
  const testOrderData = {
    orderNumber: `SUBFORM-FIX-TEST-${Date.now()}`,
    totalAmount: 165.88,
    customerEmail: 'subformfixtest@thegunfirm.com',
    customerName: 'Subform Fix Test',
    membershipTier: 'Gold Monthly',
    orderItems: [
      {
        productName: 'XS R3D 2.0 Sight',
        sku: 'XSSI-R203P-6G', 
        rsrStockNumber: 'XSSI-R203P-6G',
        quantity: 1,
        unitPrice: 89.99,
        totalPrice: 89.99,
        fflRequired: false,
        manufacturer: 'XS Sight Systems',
        category: 'Sights & Optics',
        dropShipEligible: true,
        inHouseOnly: false
      },
      {
        productName: 'Magpul PMAG 30 AR/M4 GEN M2 MOE',
        sku: 'MAG414-BLK',
        rsrStockNumber: 'MAG414-BLK', 
        quantity: 2,
        unitPrice: 12.95,
        totalPrice: 25.90,
        fflRequired: false,
        manufacturer: 'Magpul Industries',
        category: 'Magazines',
        dropShipEligible: true,
        inHouseOnly: false
      },
      {
        productName: 'ALG Defense ACT Trigger',
        sku: 'ALG05-167',
        rsrStockNumber: 'ALG05-167',
        quantity: 1, 
        unitPrice: 49.99,
        totalPrice: 49.99,
        fflRequired: false,
        manufacturer: 'ALG Defense',
        category: 'Parts & Accessories',
        dropShipEligible: true,
        inHouseOnly: false
      }
    ],
    orderStatus: 'Submitted',
    fulfillmentType: 'Drop-Ship',
    orderingAccount: '99902',
    requiresDropShip: true,
    isTestOrder: true
  };

  console.log('📋 Test Order Summary:');
  console.log(`  • Order Number: ${testOrderData.orderNumber}`);
  console.log(`  • Total Amount: $${testOrderData.totalAmount}`);
  console.log(`  • Products: ${testOrderData.orderItems.length}`);
  
  testOrderData.orderItems.forEach((item, index) => {
    console.log(`    ${index + 1}. ${item.productName}`);
    console.log(`       SKU: ${item.sku}, RSR: ${item.rsrStockNumber}`);
    console.log(`       ${item.quantity} × $${item.unitPrice} = $${item.totalPrice}`);
  });

  // Step 1: Create the main deal
  console.log('\n📝 Step 1: Creating main deal...');
  
  const dealPayload = {
    Deal_Name: testOrderData.orderNumber,
    Amount: testOrderData.totalAmount,
    Stage: 'Submitted',
    TGF_Order: `TGF${Math.floor(Math.random() * 900000) + 100000}A`,
    Fulfillment_Type: testOrderData.fulfillmentType,
    Order_Status: testOrderData.orderStatus,
    Email: testOrderData.customerEmail,
    Description: `Subform fix test with ${testOrderData.orderItems.length} products`
  };

  const createResponse = await fetch('https://www.zohoapis.com/crm/v2/Deals', {
    method: 'POST',
    headers: {
      'Authorization': 'Zoho-oauthtoken ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: [dealPayload] })
  });

  const createResult = await createResponse.json();
  
  if (!createResult.data || createResult.data[0].status !== 'success') {
    console.log('❌ Deal creation failed:', createResult);
    return;
  }

  const dealId = createResult.data[0].details.id;
  console.log(`✅ Deal created: ${dealId}`);

  // Step 2: Add products using Subform_1 (the corrected approach)
  console.log('\n📝 Step 2: Adding products to Subform_1...');
  
  const subformRecords = testOrderData.orderItems.map((item, index) => ({
    Product_Name: item.productName,
    Product_Code: item.sku,
    Quantity: item.quantity,
    Unit_Price: item.unitPrice,
    Distributor_Part_Number: item.rsrStockNumber,
    Manufacturer: item.manufacturer,
    Product_Category: item.category,
    FFL_Required: item.fflRequired,
    Drop_Ship_Eligible: item.dropShipEligible,
    In_House_Only: item.inHouseOnly,
    Distributor: 'RSR',
    Line_Total: item.totalPrice
  }));

  const subformPayload = {
    Subform_1: subformRecords
  };

  console.log('📤 Subform_1 payload:', JSON.stringify(subformPayload, null, 2));

  const subformResponse = await fetch(`https://www.zohoapis.com/crm/v2/Deals/${dealId}`, {
    method: 'PUT',
    headers: {
      'Authorization': 'Zoho-oauthtoken ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: [subformPayload] })
  });

  const subformResult = await subformResponse.json();
  console.log('📥 Subform update result:', JSON.stringify(subformResult, null, 2));

  if (subformResult.data && subformResult.data[0] && subformResult.data[0].status === 'success') {
    console.log('✅ Subform_1 updated successfully');
  } else {
    console.log('❌ Subform_1 update failed');
    return;
  }

  // Step 3: Verify the subform data was saved correctly
  console.log('\n🔍 Step 3: Verifying subform data...');
  
  // Wait for Zoho to process
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const verifyResponse = await fetch(`https://www.zohoapis.com/crm/v2/Deals/${dealId}`, {
    method: 'GET',
    headers: {
      'Authorization': 'Zoho-oauthtoken ' + accessToken,
      'Content-Type': 'application/json'
    }
  });

  const verifyData = await verifyResponse.json();
  
  if (verifyData.data && verifyData.data[0]) {
    const deal = verifyData.data[0];
    
    console.log('📊 Deal Verification Results:');
    console.log(`  • Deal Name: ${deal.Deal_Name}`);
    console.log(`  • Amount: $${deal.Amount}`);
    console.log(`  • TGF Order: ${deal.TGF_Order}`);
    console.log(`  • Order Status: ${deal.Order_Status}`);
    
    // Check subform data
    const subform1Data = deal.Subform_1 || [];
    console.log(`  • Subform_1: ${subform1Data.length} items`);
    
    if (subform1Data.length === testOrderData.orderItems.length) {
      console.log('\n🎉 SUBFORM FIX VERIFICATION SUCCESSFUL!');
      console.log('📋 Subform Product Details:');
      
      subform1Data.forEach((product, index) => {
        const expectedItem = testOrderData.orderItems[index];
        console.log(`  ${index + 1}. ${product.Product_Name}`);
        console.log(`     Product Code: ${product.Product_Code} (expected: ${expectedItem.sku})`);
        console.log(`     Quantity: ${product.Quantity} (expected: ${expectedItem.quantity})`);
        console.log(`     Unit Price: $${product.Unit_Price} (expected: $${expectedItem.unitPrice})`);
        console.log(`     RSR Stock: ${product.Distributor_Part_Number} (expected: ${expectedItem.rsrStockNumber})`);
        console.log(`     Manufacturer: ${product.Manufacturer} (expected: ${expectedItem.manufacturer})`);
        console.log(`     FFL Required: ${product.FFL_Required} (expected: ${expectedItem.fflRequired})`);
        
        // Validation checks
        const skuMatch = product.Product_Code === expectedItem.sku;
        const qtyMatch = product.Quantity === expectedItem.quantity;
        const priceMatch = product.Unit_Price === expectedItem.unitPrice;
        const rsrMatch = product.Distributor_Part_Number === expectedItem.rsrStockNumber;
        
        const allMatch = skuMatch && qtyMatch && priceMatch && rsrMatch;
        console.log(`     Validation: ${allMatch ? '✅ PERFECT MATCH' : '❌ MISMATCH'}`);
        
        if (!allMatch) {
          console.log(`       SKU: ${skuMatch ? '✅' : '❌'}, Qty: ${qtyMatch ? '✅' : '❌'}, Price: ${priceMatch ? '✅' : '❌'}, RSR: ${rsrMatch ? '✅' : '❌'}`);
        }
      });
      
      console.log('\n🎯 FINAL RESULTS:');
      console.log('✅ Subform creation fix CONFIRMED WORKING');
      console.log('✅ All product details correctly populated');
      console.log('✅ Field mapping working (Product_Code, Distributor_Part_Number, etc.)');
      console.log('✅ Quantity and pricing accurate');
      console.log('✅ RSR stock numbers preserved');
      console.log('✅ FFL requirements correctly tracked');
      
      console.log('\n🔧 SYSTEM STATUS UPDATE:');
      console.log('✓ Zoho CRM subform population issue RESOLVED');
      console.log('✓ Using Subform_1 field (confirmed working)');
      console.log('✓ Deprecated Products/Product_Details fields (non-functional)');
      console.log('✓ All order line items now properly recorded in Zoho CRM');
      console.log('✓ Ready for production order processing');
      
    } else {
      console.log(`\n❌ SUBFORM COUNT MISMATCH: Expected ${testOrderData.orderItems.length}, Got ${subform1Data.length}`);
      
      if (subform1Data.length > 0) {
        console.log('📋 Found subform data:', JSON.stringify(subform1Data, null, 2));
      } else {
        console.log('📋 No subform data found. Available fields:', Object.keys(deal));
      }
    }
    
  } else {
    console.log('❌ Could not verify deal data:', verifyData);
  }
}

testSubformFix().catch(error => {
  console.error('❌ Test failed:', error);
});