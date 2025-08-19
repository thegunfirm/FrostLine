/**
 * Diagnose the exact subform issue using working authentication
 */

async function diagnoseSubformIssue() {
  console.log('🔍 DIAGNOSING ZOHO SUBFORM ISSUE\n');

  // Generate a fresh token using the working method
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

  // Test 1: Create a simple deal
  console.log('\n📝 TEST 1: Creating simple test deal...');
  
  const simpleDeal = {
    Deal_Name: `Subform Diagnostic ${Date.now()}`,
    Amount: 100.00,
    Stage: 'Submitted'
  };

  const createResponse = await fetch('https://www.zohoapis.com/crm/v2/Deals', {
    method: 'POST',
    headers: {
      'Authorization': 'Zoho-oauthtoken ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: [simpleDeal] })
  });

  const createResult = await createResponse.json();
  console.log('📥 Deal creation result:', JSON.stringify(createResult, null, 2));

  if (!createResult.data || createResult.data[0].status !== 'success') {
    console.log('❌ Deal creation failed');
    return;
  }

  const dealId = createResult.data[0].details.id;
  console.log(`✅ Deal created: ${dealId}`);

  // Test 2: Try different subform approaches
  console.log('\n📝 TEST 2: Testing different subform approaches...');

  // Approach A: Standard Products field (existing method)
  console.log('\n🔧 Approach A: Standard Products field');
  const approachA = {
    Products: [
      {
        Product: "6585331000001038015", // Known product ID
        Quantity: 1,
        Unit_Price: 89.99,
        Amount: 89.99
      }
    ]
  };

  const resultA = await fetch(`https://www.zohoapis.com/crm/v2/Deals/${dealId}`, {
    method: 'PUT',
    headers: {
      'Authorization': 'Zoho-oauthtoken ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: [approachA] })
  });

  const responseA = await resultA.json();
  console.log('📥 Approach A result:', JSON.stringify(responseA, null, 2));

  // Approach B: Product_Details field
  console.log('\n🔧 Approach B: Product_Details field');
  const approachB = {
    Product_Details: [
      {
        Product_Name: "XS R3D 2.0 Sight",
        Product_Code: "XSSI-R203P-6G",
        Quantity: 1,
        Unit_Price: 89.99,
        Amount: 89.99
      }
    ]
  };

  const resultB = await fetch(`https://www.zohoapis.com/crm/v2/Deals/${dealId}`, {
    method: 'PUT',
    headers: {
      'Authorization': 'Zoho-oauthtoken ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: [approachB] })
  });

  const responseB = await resultB.json();
  console.log('📥 Approach B result:', JSON.stringify(responseB, null, 2));

  // Approach C: Subform_1 field
  console.log('\n🔧 Approach C: Subform_1 field');
  const approachC = {
    Subform_1: [
      {
        Product_Name: "XS R3D 2.0 Sight",
        Product_Code: "XSSI-R203P-6G", 
        Quantity: 1,
        Unit_Price: 89.99,
        Amount: 89.99
      }
    ]
  };

  const resultC = await fetch(`https://www.zohoapis.com/crm/v2/Deals/${dealId}`, {
    method: 'PUT',
    headers: {
      'Authorization': 'Zoho-oauthtoken ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: [approachC] })
  });

  const responseC = await resultC.json();
  console.log('📥 Approach C result:', JSON.stringify(responseC, null, 2));

  // Test 3: Fetch the deal to see what actually got saved
  console.log('\n🔍 TEST 3: Fetching deal to verify what was saved...');
  
  const fetchResponse = await fetch(`https://www.zohoapis.com/crm/v2/Deals/${dealId}`, {
    method: 'GET',
    headers: {
      'Authorization': 'Zoho-oauthtoken ' + accessToken,
      'Content-Type': 'application/json'
    }
  });

  const dealData = await fetchResponse.json();
  
  if (dealData.data && dealData.data[0]) {
    const deal = dealData.data[0];
    console.log('\n📊 Deal fields after all updates:');
    
    const allFields = Object.keys(deal).sort();
    allFields.forEach(field => {
      const value = deal[field];
      if (field.toLowerCase().includes('product') || 
          field.toLowerCase().includes('subform') || 
          field.toLowerCase().includes('line') ||
          Array.isArray(value)) {
        console.log(`  • ${field}: ${Array.isArray(value) ? `array[${value.length}]` : typeof value}`);
        if (Array.isArray(value) && value.length > 0) {
          console.log(`    ↳ First item:`, JSON.stringify(value[0], null, 2));
        }
      }
    });

    // Specifically check for product data
    console.log('\n🎯 SPECIFIC PRODUCT FIELD CHECK:');
    ['Products', 'Product_Details', 'Subform_1'].forEach(field => {
      if (deal[field] !== undefined) {
        console.log(`✅ ${field}:`, Array.isArray(deal[field]) ? `${deal[field].length} items` : typeof deal[field]);
        if (Array.isArray(deal[field]) && deal[field].length > 0) {
          console.log(`   Content:`, JSON.stringify(deal[field], null, 2));
        }
      } else {
        console.log(`❌ ${field}: not found`);
      }
    });

  } else {
    console.log('❌ Could not fetch deal data:', dealData);
  }

  console.log('\n🎉 DIAGNOSIS COMPLETE');
}

diagnoseSubformIssue().catch(error => {
  console.error('❌ Diagnosis failed:', error);
});