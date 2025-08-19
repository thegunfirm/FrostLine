// Check the actual Product_Code mapping in recent Zoho records
console.log('🔍 Checking actual Product_Code mapping in Zoho records');

async function checkProductCodeMapping() {
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
    
    // Find recent deals with Beretta products
    console.log('🔍 Searching for recent deals with Beretta products...');
    
    const dealsResponse = await fetch('https://www.zohoapis.com/crm/v2/Deals?fields=id,Deal_Name,Amount,Modified_Time,Product_Details,Subform_1&sort_by=Modified_Time&sort_order=desc&per_page=10', {
      headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
    });
    
    const dealsData = await dealsResponse.json();
    
    if (dealsData.data) {
      console.log(`📋 Found ${dealsData.data.length} recent deals`);
      
      for (const deal of dealsData.data) {
        if (deal.Deal_Name && (deal.Deal_Name.includes('TGF') || deal.Deal_Name.includes('Beretta'))) {
          console.log(`\n🔎 Checking Deal: ${deal.Deal_Name} (ID: ${deal.id})`);
          console.log(`   Amount: $${deal.Amount || 'N/A'}`);
          console.log(`   Modified: ${deal.Modified_Time}`);
          
          // Check subform data
          const subformData = deal.Product_Details || deal.Subform_1 || [];
          
          if (subformData && subformData.length > 0) {
            console.log(`   📦 Products in subform: ${subformData.length}`);
            
            subformData.forEach((product, i) => {
              console.log(`     ${i+1}. ${product.Product_Name || 'Unknown Product'}`);
              console.log(`        Product_Code: "${product.Product_Code || 'EMPTY'}"${product.Product_Code ? ' ✅' : ' ❌'}`);
              console.log(`        Distributor_Part_Number: "${product.Distributor_Part_Number || 'EMPTY'}"`);
              console.log(`        Manufacturer: "${product.Manufacturer || 'N/A'}"`);
              
              // Check if this is a Beretta
              if (product.Product_Name && product.Product_Name.toLowerCase().includes('beretta')) {
                console.log(`        🎯 BERETTA FOUND - Product_Code should contain manufacturer SKU`);
                if (!product.Product_Code || product.Product_Code.trim() === '') {
                  console.log(`        ❌ ISSUE: Product_Code is empty for Beretta product!`);
                } else {
                  console.log(`        ✅ GOOD: Product_Code contains: ${product.Product_Code}`);
                }
              }
            });
          } else {
            console.log(`   ❌ No products found in subform`);
          }
        }
      }
    }
    
    // Now check the Products module to see what's in there
    console.log('\n🔍 Checking Products module for recent Beretta products...');
    
    const productsResponse = await fetch('https://www.zohoapis.com/crm/v2/Products?fields=id,Product_Name,Product_Code,Distributor_Part_Number,Manufacturer,Modified_Time&sort_by=Modified_Time&sort_order=desc&per_page=10', {
      headers: { 'Authorization': 'Zoho-oauthtoken ' + tokenData.access_token }
    });
    
    const productsData = await productsResponse.json();
    
    if (productsData.data) {
      console.log(`📦 Found ${productsData.data.length} recent products in Products module`);
      
      productsData.data.forEach((product, i) => {
        console.log(`  ${i+1}. ${product.Product_Name || 'Unknown'}`);
        console.log(`     Product_Code: "${product.Product_Code || 'EMPTY'}"${product.Product_Code ? ' ✅' : ' ❌'}`);
        console.log(`     Distributor_Part_Number: "${product.Distributor_Part_Number || 'EMPTY'}"`);
        console.log(`     Manufacturer: "${product.Manufacturer || 'N/A'}"`);
        console.log(`     Modified: ${product.Modified_Time}`);
        
        if (product.Product_Name && product.Product_Name.toLowerCase().includes('beretta')) {
          console.log(`     🎯 BERETTA PRODUCT - checking Product_Code`);
          if (!product.Product_Code || product.Product_Code.trim() === '') {
            console.log(`     ❌ CRITICAL: Beretta product has empty Product_Code!`);
          }
        }
      });
    }
    
    console.log('\n🔧 Summary of findings:');
    console.log('- Checking if Product_Code fields are properly populated');
    console.log('- Looking for patterns in empty vs populated fields');
    console.log('- Identifying where the mapping logic may be failing');
    
  } catch (error) {
    console.log('❌ Check failed:', error.message);
  }
}

checkProductCodeMapping();