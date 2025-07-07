/**
 * Investigate RSR subCategory Field - Field 17 Analysis
 * Examines actual RSR file to understand field 17 (subCategory) content
 * This will help improve product categorization beyond basic departmentNumber
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Parse RSR inventory line (77 fields)
 */
function parseRSRLine(line: string) {
  const fields = line.split(';');
  
  if (fields.length < 77) {
    return null;
  }

  return {
    stockNumber: fields[0]?.trim() || '',
    upcCode: fields[1]?.trim() || '',
    description: fields[2]?.trim() || '',
    departmentNumber: fields[3]?.trim() || '',
    manufacturerId: fields[4]?.trim() || '',
    retailPrice: fields[5]?.trim() || '0',
    rsrPricing: fields[6]?.trim() || '0',
    productWeight: fields[7]?.trim() || '0',
    inventoryQuantity: fields[8]?.trim() || '0',
    model: fields[9]?.trim() || '',
    fullManufacturerName: fields[10]?.trim() || '',
    manufacturerPartNumber: fields[11]?.trim() || '',
    allocatedCloseoutDeleted: fields[12]?.trim() || '',
    expandedDescription: fields[13]?.trim() || '',
    imageName: fields[14]?.trim() || '',
    // Field 15-65 are state restrictions (51 states)
    subCategory: fields[66]?.trim() || '', // This might be field 17 in some documentation
    groundShipOnly: fields[67]?.trim() || '',
    adultSignatureRequired: fields[68]?.trim() || '',
    blockedFromDropShip: fields[69]?.trim() || '',
    dateEntered: fields[70]?.trim() || '',
    retailMAP: fields[71]?.trim() || '0',
    imageDisclaimer: fields[72]?.trim() || '',
    shippingLength: fields[73]?.trim() || '0',
    shippingWidth: fields[74]?.trim() || '0',
    shippingHeight: fields[75]?.trim() || '0',
    prop65: fields[76]?.trim() || '',
    vendorApprovalRequired: fields[77]?.trim() || ''
  };
}

/**
 * Investigate RSR file structure and subCategory content
 */
async function investigateRSRSubCategory() {
  console.log('🔍 INVESTIGATING RSR SUBCATEGORY FIELD...\n');

  const rsrFilePath = resolve('./server/data/distributors/rsr/downloads/inventory/rsrinventory-new.txt');
  
  try {
    const fileContent = readFileSync(rsrFilePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📄 RSR File: ${lines.length} total lines\n`);

    // Sample analysis of first 20 products
    console.log('🔬 FIELD ANALYSIS - First 20 Products:');
    console.log('=' .repeat(120));
    console.log('Stock#'.padEnd(20) + 'Description'.padEnd(40) + 'Dept'.padEnd(6) + 'Field66/SubCat'.padEnd(15) + 'Field17'.padEnd(15));
    console.log('=' .repeat(120));

    const sampleProducts = lines.slice(0, 20);
    const subCategoryValues = new Set<string>();
    const field17Values = new Set<string>();

    for (const line of sampleProducts) {
      const product = parseRSRLine(line);
      if (!product) continue;

      const fields = line.split(';');
      const field17 = fields[16]?.trim() || ''; // Actual field 17 (0-indexed = 16)
      
      subCategoryValues.add(product.subCategory);
      field17Values.add(field17);

      console.log(
        product.stockNumber.padEnd(20) + 
        product.description.substring(0, 38).padEnd(40) + 
        product.departmentNumber.padEnd(6) + 
        product.subCategory.padEnd(15) + 
        field17.padEnd(15)
      );
    }

    console.log('\n📊 UNIQUE VALUES FOUND:');
    console.log('\nField 66 (current subCategory) values:');
    Array.from(subCategoryValues).forEach(val => console.log(`  "${val}"`));
    
    console.log('\nField 17 (actual field 17) values:');
    Array.from(field17Values).forEach(val => console.log(`  "${val}"`));

    // Look for specific products mentioned by user
    console.log('\n🎯 SEARCHING FOR SPECIFIC PRODUCTS:');
    console.log('-'.repeat(80));
    
    const searchTerms = ['ZAF', 'P320', 'GLOCK', 'SLIDE', 'BARREL'];
    
    for (const term of searchTerms) {
      console.log(`\n🔍 Products containing "${term}":`);
      let found = 0;
      
      for (const line of lines.slice(0, 1000)) { // Check first 1000 products
        const product = parseRSRLine(line);
        if (!product) continue;
        
        if (product.description.toUpperCase().includes(term) || 
            product.stockNumber.toUpperCase().includes(term)) {
          
          const fields = line.split(';');
          const field17 = fields[16]?.trim() || '';
          
          console.log(`  ${product.stockNumber}: ${product.description}`);
          console.log(`    Dept: ${product.departmentNumber}, Field66: "${product.subCategory}", Field17: "${field17}"`);
          found++;
          
          if (found >= 5) break; // Limit to 5 examples per term
        }
      }
      
      if (found === 0) {
        console.log(`  No products found containing "${term}" in first 1000 entries`);
      }
    }

    // Check if ZAFZPS2P320CBLK exists
    console.log('\n🎯 SEARCHING FOR ZAFZPS2P320CBLK:');
    let foundSpecific = false;
    
    for (const line of lines) {
      if (line.includes('ZAFZPS2P320CBLK')) {
        const product = parseRSRLine(line);
        if (product) {
          const fields = line.split(';');
          const field17 = fields[16]?.trim() || '';
          
          console.log(`✅ FOUND: ${product.stockNumber}`);
          console.log(`   Description: ${product.description}`);
          console.log(`   Department: ${product.departmentNumber}`);
          console.log(`   Field 66: "${product.subCategory}"`);
          console.log(`   Field 17: "${field17}"`);
          console.log(`   Manufacturer: ${product.fullManufacturerName}`);
          foundSpecific = true;
        }
        break;
      }
    }
    
    if (!foundSpecific) {
      console.log('❌ ZAFZPS2P320CBLK not found in RSR file');
    }

    // Department analysis
    console.log('\n📈 DEPARTMENT ANALYSIS:');
    console.log('-'.repeat(60));
    const deptCounts = new Map<string, number>();
    
    for (const line of lines.slice(0, 5000)) { // Analyze first 5000 products
      const product = parseRSRLine(line);
      if (!product) continue;
      
      const count = deptCounts.get(product.departmentNumber) || 0;
      deptCounts.set(product.departmentNumber, count + 1);
    }
    
    Array.from(deptCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([dept, count]) => {
        console.log(`  Department ${dept}: ${count} products`);
      });

    console.log('\n✅ INVESTIGATION COMPLETE');
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Check if field 17 contains useful categorization data');
    console.log('2. Update RSR file processor to capture field 17 if valuable');
    console.log('3. Improve categorization logic using additional fields');
    console.log('4. Focus on name/description analysis for better accuracy');

  } catch (error) {
    console.error('❌ Error reading RSR file:', error);
    console.log('\n🔧 Possible solutions:');
    console.log('1. Check if RSR file exists at expected location');
    console.log('2. Verify RSR FTP sync has been completed');
    console.log('3. Run RSR sync process if needed');
  }
}

// Run the investigation
investigateRSRSubCategory().catch(console.error);