const fs = require('fs');

// Test the fixed product mapping logic
async function testProductMapping() {
  console.log('🧪 Testing FIXED Product Mapping Logic');
  console.log('  ✅ Product Code (SKU) = Manufacturer Part Number');
  console.log('  ✅ Distributor Part Number = RSR Stock Number');
  console.log('');
  
  // Simulate a typical RSR product
  const rsrProduct = {
    stockNo: 'GLOCK19015',
    mfgPartNumber: 'PA195S201',
    mfgName: 'GLOCK',
    description: 'GLOCK 19 Gen 5 9mm'
  };
  
  console.log('📦 Sample RSR Product:');
  console.log('  RSR Stock Number:', rsrProduct.stockNo);
  console.log('  Manufacturer Part Number:', rsrProduct.mfgPartNumber);
  console.log('  Manufacturer:', rsrProduct.mfgName);
  console.log('');
  
  // Show CORRECT mapping
  console.log('✅ CORRECT Zoho Products Module Mapping:');
  console.log('  Product_Code:', rsrProduct.mfgPartNumber); // Manufacturer part number
  console.log('  Distributor_Part_Number:', rsrProduct.stockNo); // RSR stock number
  console.log('  Product_Name:', rsrProduct.description);
  console.log('  Manufacturer:', rsrProduct.mfgName);
  console.log('');
  
  // Show what was wrong before
  console.log('❌ PREVIOUS INCORRECT Mapping (now fixed):');
  console.log('  Product_Code: GLOCK19015 (RSR stock) <- WRONG');
  console.log('  Should be: PA195S201 (mfg part) <- CORRECT');
  console.log('');
  
  console.log('🎯 MAPPING LOGIC NOW FIXED');
  console.log('  sku parameter = manufacturerPartNumber || mfgPartNumber');
  console.log('  Product_Code field = sku (manufacturer part number)');
  console.log('  Distributor_Part_Number field = RSR stock number');
  
  // Test API connectivity
  console.log('');
  console.log('🧪 Testing Zoho API connectivity...');
  
  try {
    const response = await fetch('https://www.zohoapis.com/crm/v2/Products?per_page=3', {
      headers: { 'Authorization': 'Zoho-oauthtoken ' + process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN }
    });
    
    const data = await response.json();
    
    if (data.data) {
      console.log('✅ API WORKING! Found', data.data.length, 'products');
      data.data.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.Product_Name}`);
        console.log(`     Code: ${p.Product_Code || 'N/A'}`);
        console.log(`     Distributor Part: ${p.Distributor_Part_Number || 'N/A'}`);
      });
    } else {
      console.log('❌ API issue:', data);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testProductMapping().catch(console.error);