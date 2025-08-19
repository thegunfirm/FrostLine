// Create RSR_Stock_Number field for distributor part numbers
console.log('🔧 Creating RSR_Stock_Number field');

async function createRSRField() {
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
    
    // Create RSR_Stock_Number field
    const rsrField = {
      fields: [{
        api_name: 'RSR_Stock_Number',
        field_label: 'RSR Stock Number',
        data_type: 'text',
        length: 100
      }]
    };
    
    const fieldResponse = await fetch('https://www.zohoapis.com/crm/v2/settings/fields?module=Products', {
      method: 'POST',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rsrField)
    });
    
    const fieldResult = await fieldResponse.json();
    console.log('📤 RSR_Stock_Number field creation:', JSON.stringify(fieldResult, null, 2));
    
    if (fieldResult.fields && fieldResult.fields[0] && fieldResult.fields[0].status === 'success') {
      console.log('✅ RSR_Stock_Number field created successfully');
      
      // Test the field
      console.log('\n⏳ Waiting for field to be available...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const testPayload = {
        Product_Name: 'RSR Field Test Product',
        Mfg_Part_Number: 'TEST-MFG-123',
        RSR_Stock_Number: 'RSR-STOCK-456',
        Manufacturer: 'Test Manufacturer'
      };
      
      console.log('📤 Testing both fields together:', JSON.stringify(testPayload, null, 2));
      
      const testResponse = await fetch('https://www.zohoapis.com/crm/v2/Products', {
        method: 'POST',
        headers: {
          'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: [testPayload] })
      });
      
      const testResult = await testResponse.json();
      console.log('📥 Test result:', JSON.stringify(testResult, null, 2));
      
      if (testResult.data && testResult.data[0] && testResult.data[0].status === 'success') {
        const productId = testResult.data[0].details.id;
        console.log(`✅ Test product created: ${productId}`);
        
        // Verify both fields
        setTimeout(async () => {
          console.log('\n🔍 Verifying both fields...');
          
          const verifyResponse = await fetch(`https://www.zohoapis.com/crm/v2/Products/${productId}?fields=Product_Name,Mfg_Part_Number,RSR_Stock_Number,Manufacturer`, {
            headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
          });
          
          const verifyData = await verifyResponse.json();
          
          if (verifyData.data && verifyData.data[0]) {
            const savedProduct = verifyData.data[0];
            console.log('📋 Final verification:');
            console.log(`  Product_Name: "${savedProduct.Product_Name || 'EMPTY'}"`);
            console.log(`  Mfg_Part_Number: "${savedProduct.Mfg_Part_Number || 'EMPTY'}"${savedProduct.Mfg_Part_Number ? ' ✅' : ' ❌'}`);
            console.log(`  RSR_Stock_Number: "${savedProduct.RSR_Stock_Number || 'EMPTY'}"${savedProduct.RSR_Stock_Number ? ' ✅' : ' ❌'}`);
            console.log(`  Manufacturer: "${savedProduct.Manufacturer || 'EMPTY'}"`);
            
            if (savedProduct.Mfg_Part_Number && savedProduct.RSR_Stock_Number) {
              console.log('\n🎉 COMPLETE SUCCESS: Both fields working!');
              console.log('');
              console.log('✅ FINAL MAPPING SOLUTION:');
              console.log('  Manufacturer SKU → Mfg_Part_Number field');
              console.log('  RSR Stock Number → RSR_Stock_Number field');
              console.log('');
              console.log('🔧 Ready to update code mapping:');
              console.log('  Product_Code → Mfg_Part_Number');
              console.log('  Distributor_Part_Number → RSR_Stock_Number');
            }
          }
        }, 2000);
      }
    } else {
      console.log('❌ RSR_Stock_Number field creation failed');
    }
    
  } catch (error) {
    console.log('❌ RSR field creation failed:', error.message);
  }
}

createRSRField();