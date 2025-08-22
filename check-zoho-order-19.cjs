const { ZohoService } = require('./server/zoho-service.ts');

async function checkDealsAndProducts() {
  try {
    console.log('🔍 Checking Zoho Deals and Products for Order 19...');
    
    const zohoService = new ZohoService({
      clientId: process.env.ZOHO_CLIENT_ID,
      clientSecret: process.env.ZOHO_CLIENT_SECRET,
      redirectUri: process.env.ZOHO_REDIRECT_URI,
      accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
      apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com',
      accessToken: process.env.ZOHO_ACCESS_TOKEN,
      refreshToken: process.env.ZOHO_REFRESH_TOKEN
    });

    // Search for deals with TGF-ORDER-19
    console.log('\n📋 Searching for Deal: TGF-ORDER-19...');
    const dealResponse = await zohoService.makeAPIRequest('Deals?fields=Deal_Name,Amount,Stage,id,Description,TGF_Order_Number&per_page=200');
    
    if (dealResponse.data && dealResponse.data.length > 0) {
      const deal = dealResponse.data.find(d => d.Deal_Name?.includes('TGF-ORDER-19') || d.TGF_Order_Number === '19');
      
      if (deal) {
        console.log('✅ Deal Found:');
        console.log('  Deal ID:', deal.id);
        console.log('  Deal Name:', deal.Deal_Name);
        console.log('  Amount:', deal.Amount);
        console.log('  Stage:', deal.Stage);
        console.log('  TGF Order Number:', deal.TGF_Order_Number);
        
        // Get detailed deal info including subforms
        console.log('\n🔍 Getting detailed deal information...');
        const detailedDeal = await zohoService.makeAPIRequest(`Deals/${deal.id}`);
        console.log('📋 Deal Details:', JSON.stringify(detailedDeal, null, 2));
        
        // Check if subform exists
        if (detailedDeal.data && detailedDeal.data.length > 0) {
          const dealData = detailedDeal.data[0];
          if (dealData.Subform_1) {
            console.log('\n✅ Subform_1 Found with', dealData.Subform_1.length, 'items:');
            dealData.Subform_1.forEach((item, index) => {
              console.log(`  Item ${index + 1}:`);
              console.log('    Product_Name:', item.Product_Name);
              console.log('    Product_Code:', item.Product_Code);
              console.log('    Product_Lookup:', item.Product_Lookup);
              console.log('    Quantity:', item.Quantity);
              console.log('    Unit_Price:', item.Unit_Price);
              console.log('    UPC:', item.UPC);
              console.log('    Distributor_Code:', item.Distributor_Code);
            });
          } else {
            console.log('❌ No Subform_1 found in deal');
          }
        }
      } else {
        console.log('❌ Deal TGF-ORDER-19 not found');
      }
    } else {
      console.log('❌ No deals found');
    }

    // Search for products in Products module
    console.log('\n🏭 Searching Products module for our test products...');
    
    // Search for Glock product
    const glockSearch = await zohoService.makeAPIRequest('Products/search?criteria=(Product_Code:equals:PR1755503FS)');
    if (glockSearch.data && glockSearch.data.length > 0) {
      console.log('\n✅ Glock Product Found in Products Module:');
      const glockProduct = glockSearch.data[0];
      console.log('  Product ID:', glockProduct.id);
      console.log('  Product Name:', glockProduct.Product_Name);
      console.log('  Product Code:', glockProduct.Product_Code);
      console.log('  Mfg Part Number:', glockProduct.Mfg_Part_Number);
      console.log('  RSR Stock Number:', glockProduct.RSR_Stock_Number);
      console.log('  Manufacturer:', glockProduct.Manufacturer);
      console.log('  UPC:', glockProduct.UPC);
      console.log('  FFL Required:', glockProduct.FFL_Required);
    } else {
      console.log('❌ Glock product not found in Products module');
    }
    
    // Search for Shield accessory
    const shieldSearch = await zohoService.makeAPIRequest('Products/search?criteria=(Product_Code:equals:G19-ME-5-RED)');
    if (shieldSearch.data && shieldSearch.data.length > 0) {
      console.log('\n✅ Shield Accessory Found in Products Module:');
      const shieldProduct = shieldSearch.data[0];
      console.log('  Product ID:', shieldProduct.id);
      console.log('  Product Name:', shieldProduct.Product_Name);
      console.log('  Product Code:', shieldProduct.Product_Code);
      console.log('  Mfg Part Number:', shieldProduct.Mfg_Part_Number);
      console.log('  RSR Stock Number:', shieldProduct.RSR_Stock_Number);
      console.log('  Manufacturer:', shieldProduct.Manufacturer);
      console.log('  UPC:', shieldProduct.UPC);
      console.log('  FFL Required:', shieldProduct.FFL_Required);
    } else {
      console.log('❌ Shield accessory not found in Products module');
    }

  } catch (error) {
    console.error('❌ Error checking Zoho data:', error.message);
  }
}

checkDealsAndProducts().catch(console.error);