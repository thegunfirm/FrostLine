// Process existing RSR inventory file into database
const fs = require('fs');
const path = require('path');

async function processExistingRSRData() {
  console.log('🔄 Processing Existing RSR Inventory Data\n');

  try {
    // Read the existing RSR inventory file
    const inventoryFile = './server/data/rsr/downloads/rsrinventory-new.txt';
    
    if (!fs.existsSync(inventoryFile)) {
      console.log('❌ RSR inventory file not found');
      return false;
    }

    console.log('📖 Reading RSR inventory file...');
    const inventoryData = fs.readFileSync(inventoryFile, 'utf8');
    const lines = inventoryData.split('\n').filter(line => line.trim());
    
    console.log(`✅ Found ${lines.length} product records`);

    // Process first 100 products to test the import
    console.log('🧪 Processing first 100 products as test...');
    
    const testProducts = [];
    for (let i = 0; i < Math.min(100, lines.length); i++) {
      const fields = lines[i].split(';');
      
      if (fields.length >= 77) { // RSR has 77+ fields
        const product = {
          // Field 1: RSR Stock Number (for ordering)
          rsrStockNumber: fields[0] || '',
          
          // Field 2: UPC
          upc: fields[1] || '',
          
          // Field 3: Product Description  
          name: fields[2] || '',
          
          // Field 4: Department Number
          departmentNumber: fields[3] || '',
          
          // Field 5: Manufacturer Number
          manufacturerNumber: fields[4] || '',
          
          // Field 6: Retail Price (MSRP)
          msrp: parseFloat(fields[5]) || 0,
          
          // Field 7: RSR Regular Price
          price: parseFloat(fields[6]) || 0,
          
          // Field 8: Inventory Quantity  
          quantity: parseInt(fields[7]) || 0,
          
          // Field 9: Allocated Inventory
          allocatedQuantity: parseInt(fields[8]) || 0,
          
          // Field 10: Model
          model: fields[9] || '',
          
          // Field 11: MFG Name
          manufacturer: fields[10] || '',
          
          // Field 12: MFG Part Number (THIS IS THE REAL SKU)
          manufacturerPartNumber: fields[11] || '',
          
          // Field 13: Product Status
          status: fields[12] || '',
          
          // Field 14: Long Description
          description: fields[13] || '',
          
          // Field 15: Image Name
          imageUrl: fields[14] || '',
          
          // Additional fields for compliance
          fflRequired: ['01', '02', '03', '04', '05', '06'].includes(fields[3]), // Firearms departments
          
          // Create proper SKU from manufacturer part number
          sku: fields[11] || fields[0], // Use mfg part number as SKU, fallback to RSR stock
        };
        
        testProducts.push(product);
      }
    }

    console.log(`✅ Processed ${testProducts.length} products for import`);
    
    // Sample a few products to show
    console.log('\n📋 Sample processed products:');
    testProducts.slice(0, 3).forEach((product, i) => {
      console.log(`   ${i+1}. ${product.name}`);
      console.log(`      SKU: ${product.sku} (Mfg Part: ${product.manufacturerPartNumber})`);
      console.log(`      RSR Stock: ${product.rsrStockNumber}`);
      console.log(`      Price: $${product.price} | MSRP: $${product.msrp}`);
      console.log(`      Stock: ${product.quantity} | Mfg: ${product.manufacturer}`);
    });

    // Now import to database via API
    console.log('\n💾 Importing to database...');
    
    const axios = require('axios');
    let imported = 0;
    
    // Import in batches of 10
    for (let i = 0; i < testProducts.length; i += 10) {
      const batch = testProducts.slice(i, i + 10);
      
      try {
        const response = await axios.post('http://localhost:5000/api/admin/products/bulk-create', {
          products: batch
        });
        
        imported += batch.length;
        console.log(`✅ Imported batch ${Math.floor(i/10) + 1}: ${imported}/${testProducts.length} products`);
        
      } catch (error) {
        console.log(`❌ Batch ${Math.floor(i/10) + 1} failed:`, error.response?.data || error.message);
        
        // Try individual imports for this batch
        for (const product of batch) {
          try {
            await axios.post('http://localhost:5000/api/products', product);
            imported++;
            console.log(`✅ Individual import: ${product.name}`);
          } catch (err) {
            console.log(`❌ Failed: ${product.name} - ${err.response?.data?.message || err.message}`);
          }
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 Import Complete: ${imported}/${testProducts.length} products imported`);
    
    // Verify the import
    console.log('\n🔍 Verifying import...');
    try {
      const verifyResponse = await axios.get('http://localhost:5000/api/products?limit=5');
      console.log(`✅ Database now contains ${verifyResponse.data.total || verifyResponse.data.products?.length || 0} products`);
      
      if (verifyResponse.data.products?.length > 0) {
        console.log('📋 Sample imported products:');
        verifyResponse.data.products.slice(0, 3).forEach((product, i) => {
          console.log(`   ${i+1}. ${product.name} - $${product.price}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Verification failed:', error.message);
    }

    return imported > 0;

  } catch (error) {
    console.error('❌ Error processing RSR data:', error.message);
    return false;
  }
}

// Run the processing
processExistingRSRData().then(success => {
  if (success) {
    console.log('\n✅ RSR data processing completed successfully');
  } else {
    console.log('\n❌ RSR data processing failed');
  }
  process.exit(success ? 0 : 1);
});