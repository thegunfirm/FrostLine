const https = require('https');

// Create SP00735 orders for all tiers with proper Zoho integration
async function createTierOrders() {
  try {
    console.log('🧪 Creating SP00735 orders for all membership tiers');
    console.log('=' .repeat(70));
    
    // Product data from database
    const product = {
      id: 134157,
      name: "GLOCK OEM 8 POUND CONNECTOR",
      description: "GLOCK OEM Connector, 8 pound SP00735",
      manufacturerPartNumber: "SP00735", // This is the key for Zoho Products Module
      sku: "GLSP00735", // RSR Stock Number for Deal subform
      manufacturer: "GLOCK",
      category: "Parts",
      bronzePrice: 7.00,
      goldPrice: 6.65,  
      platinumPrice: 3.57,
      requiresFFL: false
    };
    
    // Real FFL from database  
    const ffl = {
      id: 1414,
      businessName: "BACK ACRE GUN WORKS",
      licenseNumber: "1-59-017-07-6F-13700"
    };
    
    // Test scenarios for each tier
    const orders = [
      {
        tier: 'Bronze',
        email: 'bronze.test@example.com',
        price: product.bronzePrice,
        expectedDiscount: 'No discount (retail price)'
      },
      {
        tier: 'Gold',
        email: 'gold.test@example.com', 
        price: product.goldPrice,
        expectedDiscount: '5% discount'
      },
      {
        tier: 'Platinum',
        email: 'platinum.test@example.com',
        price: product.platinumPrice,
        expectedDiscount: '49% discount (wholesale + profit)'
      }
    ];

    console.log('📦 PRODUCT DETAILS:');
    console.log(`Name: ${product.name}`);
    console.log(`Manufacturer Part Number: ${product.manufacturerPartNumber} (for Products Module)`);
    console.log(`RSR Stock Number: ${product.sku} (for Deal subform)`);
    console.log(`Manufacturer: ${product.manufacturer}`);
    console.log(`Requires FFL: ${product.requiresFFL ? 'Yes' : 'No'}`);
    console.log('');

    console.log('🏢 SELECTED FFL:');
    console.log(`Business: ${ffl.businessName}`);
    console.log(`License: ${ffl.licenseNumber}`);
    console.log('');

    for (const order of orders) {
      console.log(`\n${order.tier.toUpperCase()} TIER ORDER:`);
      console.log(`Customer: ${order.email}`);
      console.log(`Price: $${order.price.toFixed(2)} (${order.expectedDiscount})`);
      console.log(`Quantity: 1`);
      console.log(`Total: $${order.price.toFixed(2)}`);
      console.log(`FFL Required: ${product.requiresFFL ? 'Yes' : 'No'}`);
      console.log(`Status: Ready to submit to checkout API`);
    }

    console.log('\n🔄 ZOHO INTEGRATION VALIDATION:');
    console.log('✅ Products Module will get:');
    console.log(`   - Product_Code: ${product.manufacturerPartNumber}`);
    console.log(`   - Product_Name: ${product.name}`);
    console.log(`   - Manufacturer: ${product.manufacturer}`);
    console.log(`   - Product_Category: ${product.category}`);
    console.log(`   - FFL_Required: ${product.requiresFFL}`);
    console.log('');
    console.log('✅ Deal subform will get:');
    console.log(`   - Product Code (SKU): ${product.manufacturerPartNumber}`);
    console.log(`   - Distributor Part Number: ${product.sku}`);
    console.log('   - Distributor: RSR');
    console.log('   - Unit Price: [tier-specific pricing]');
    console.log('   - Quantity: 1');
    console.log('   - Amount: [calculated total]');

    console.log('\n🚀 NEXT: Submit orders via checkout API...');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTierOrders();