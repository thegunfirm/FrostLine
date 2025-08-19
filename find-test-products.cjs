/**
 * Find real inventory products for test sale
 */

const fetch = require('node-fetch');

async function findTestProducts() {
  console.log('🔍 Finding real inventory for test sale...');
  
  try {
    // Search for Glock handguns
    console.log('🔫 Searching for Glock handguns...');
    const glockResponse = await fetch('http://localhost:5000/api/products?search=glock&category=Handguns&page=1&limit=5');
    const glockData = await glockResponse.json();
    
    console.log(`📋 Found ${glockData.products?.length || 0} Glock products`);
    
    const glock = glockData.products?.find(p => 
      p.manufacturer?.toLowerCase().includes('glock') && 
      p.category === 'Handguns' && 
      p.fflRequired === true &&
      p.price > 0
    );
    
    // Search for accessories (magazines)
    console.log('🔧 Searching for accessories...');
    const accessoryResponse = await fetch('http://localhost:5000/api/products?category=Magazines&page=1&limit=5');
    const accessoryData = await accessoryResponse.json();
    
    console.log(`📋 Found ${accessoryData.products?.length || 0} magazine products`);
    
    const accessory = accessoryData.products?.find(p => 
      p.category === 'Magazines' && 
      p.fflRequired === false &&
      p.price > 0
    );
    
    if (glock) {
      console.log('✅ Selected Glock:', glock.name);
      console.log('   - SKU:', glock.sku);
      console.log('   - Price: $' + glock.price);
      console.log('   - FFL Required:', glock.fflRequired);
      console.log('   - RSR Stock:', glock.rsrStockNumber);
    } else {
      console.log('❌ No suitable Glock found');
    }
    
    if (accessory) {
      console.log('✅ Selected Accessory:', accessory.name);
      console.log('   - SKU:', accessory.sku);
      console.log('   - Price: $' + accessory.price);
      console.log('   - FFL Required:', accessory.fflRequired);
      console.log('   - RSR Stock:', accessory.rsrStockNumber);
    } else {
      console.log('❌ No suitable accessory found');
    }
    
    return { glock, accessory };
    
  } catch (error) {
    console.error('❌ Error finding products:', error.message);
    return { glock: null, accessory: null };
  }
}

// Also find a real FFL
async function findTestFFL() {
  console.log('🏪 Finding real FFL dealer...');
  
  try {
    const fflResponse = await fetch('http://localhost:5000/api/ffls?state=TX&limit=1');
    const fflData = await fflResponse.json();
    
    if (fflData.ffls && fflData.ffls.length > 0) {
      const ffl = fflData.ffls[0];
      console.log('✅ Selected FFL:', ffl.businessName);
      console.log('   - License:', ffl.licenseNumber);
      console.log('   - City:', ffl.city + ', ' + ffl.state);
      console.log('   - ID:', ffl.id);
      return ffl;
    } else {
      console.log('❌ No FFLs found');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error finding FFL:', error.message);
    return null;
  }
}

async function main() {
  const products = await findTestProducts();
  const ffl = await findTestFFL();
  
  console.log('\n📋 Test Sale Summary:');
  console.log('Products:', products.glock ? 'Glock ✅' : 'Glock ❌', '|', products.accessory ? 'Accessory ✅' : 'Accessory ❌');
  console.log('FFL:', ffl ? 'Real FFL ✅' : 'No FFL ❌');
  
  if (products.glock && products.accessory && ffl) {
    console.log('\n🎯 Ready to proceed with test sale!');
    
    // Export the data for use in the test sale
    const testSaleData = {
      glock: products.glock,
      accessory: products.accessory,
      ffl: ffl,
      customer: {
        email: 'platinum.test@thegunfirm.com',
        firstName: 'Platinum',
        lastName: 'TestUser',
        membershipTier: 'Platinum Monthly'
      }
    };
    
    console.log('\n📄 Test sale data prepared:', JSON.stringify(testSaleData, null, 2));
    return testSaleData;
  } else {
    console.log('\n❌ Missing required items for test sale');
    return null;
  }
}

main().catch(console.error);