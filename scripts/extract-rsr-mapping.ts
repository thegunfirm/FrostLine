/**
 * Extract Complete RSR Department and Subcategory Mapping
 */

import fs from 'fs';

async function extractRSRMapping() {
  console.log('📊 Extracting complete RSR department and subcategory mapping...');
  
  const filePath = 'server/data/rsr/downloads/rsrinventory-new.txt';
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  console.log(`📁 Processing ${lines.length} RSR products...`);
  
  // Track department numbers and their categories
  const departmentMap = new Map<string, Set<string>>();
  const subcategoryMap = new Map<string, Set<string>>();
  const manufacturerMap = new Map<string, Set<string>>();
  
  // Category mapping from the sync script
  const categoryMap: Record<number, string> = {
    1: 'Handguns', 2: 'Used Handguns', 3: 'Used Long Guns', 4: 'Tasers',
    5: 'Long Guns', 6: 'NFA Products', 7: 'Black Powder', 8: 'Optics',
    9: 'Optical Accessories', 10: 'Magazines', 11: 'Grips, Pads, Stocks, Bipods',
    12: 'Soft Gun Cases, Packs, Bags', 13: 'Misc. Accessories', 14: 'Holsters & Pouches',
    15: 'Reloading Equipment', 16: 'Black Powder Accessories', 17: 'Closeout Accessories',
    18: 'Ammunition', 19: 'Survival & Camping Supplies', 20: 'Lights, Lasers & Batteries',
    21: 'Cleaning Equipment', 22: 'Airguns', 23: 'Knives & Tools', 24: 'High Capacity Magazines',
    25: 'Safes & Security', 26: 'Safety & Protection', 27: 'Non-Lethal Defense',
    28: 'Binoculars', 29: 'Spotting Scopes', 30: 'Sights', 31: 'Optical Accessories',
    32: 'Barrels, Choke Tubes & Muzzle Devices', 33: 'Clothing', 34: 'Parts',
    35: 'Slings & Swivels', 36: 'Electronics', 38: 'Books, Software & DVDs',
    39: 'Targets', 40: 'Hard Gun Cases', 41: 'Upper Receivers & Conversion Kits',
    42: 'SBR Barrels & Upper Receivers', 43: 'Upper Receivers & Conversion Kits - High Capacity'
  };
  
  let processedLines = 0;
  
  for (const line of lines) {
    const fields = line.split(';');
    if (fields.length >= 15) {
      const departmentNumber = fields[3];
      const subcategoryCode = fields[9];
      const fullMfgName = fields[10];
      const productName = fields[2];
      
      if (departmentNumber && departmentNumber.trim()) {
        const category = categoryMap[parseInt(departmentNumber)] || 'Unknown';
        
        if (!departmentMap.has(departmentNumber)) {
          departmentMap.set(departmentNumber, new Set());
        }
        departmentMap.get(departmentNumber)!.add(category);
        
        // Track subcategories per department
        if (subcategoryCode && subcategoryCode.trim()) {
          const key = `${departmentNumber}:${subcategoryCode}`;
          if (!subcategoryMap.has(key)) {
            subcategoryMap.set(key, new Set());
          }
          subcategoryMap.get(key)!.add(productName.substring(0, 50) + '...');
        }
        
        // Track manufacturers per department
        if (fullMfgName && fullMfgName.trim()) {
          const mfgKey = `${departmentNumber}:${fullMfgName}`;
          if (!manufacturerMap.has(mfgKey)) {
            manufacturerMap.set(mfgKey, new Set());
          }
          manufacturerMap.get(mfgKey)!.add(category);
        }
      }
      
      processedLines++;
      if (processedLines % 5000 === 0) {
        console.log(`📈 Processed ${processedLines} lines...`);
      }
    }
  }
  
  console.log(`✅ Processing complete. Analyzed ${processedLines} products.\n`);
  
  // Display department mapping
  console.log('🏷️  COMPLETE RSR DEPARTMENT MAPPING:');
  console.log('=====================================');
  const sortedDepartments = Array.from(departmentMap.keys()).sort((a, b) => parseInt(a) - parseInt(b));
  
  for (const dept of sortedDepartments) {
    const categories = Array.from(departmentMap.get(dept)!);
    console.log(`Department ${dept.padStart(2, '0')}: ${categories.join(', ')}`);
  }
  
  // Display subcategory samples
  console.log('\n🔍 SUBCATEGORY CODE SAMPLES:');
  console.log('============================');
  const subcategoryEntries = Array.from(subcategoryMap.entries()).slice(0, 20);
  for (const [key, products] of subcategoryEntries) {
    const [dept, subcat] = key.split(':');
    const productList = Array.from(products).slice(0, 2);
    console.log(`Dept ${dept}, Subcat ${subcat}: ${productList.join(' | ')}`);
  }
  
  // Focus on handgun subcategories (department 01)
  console.log('\n🔫 DEPARTMENT 01 (HANDGUNS) SUBCATEGORIES:');
  console.log('==========================================');
  const handgunSubcats = Array.from(subcategoryMap.entries())
    .filter(([key]) => key.startsWith('01:'))
    .sort(([a], [b]) => {
      const subcatA = parseInt(a.split(':')[1]) || 0;
      const subcatB = parseInt(b.split(':')[1]) || 0;
      return subcatA - subcatB;
    });
  
  for (const [key, products] of handgunSubcats) {
    const subcatCode = key.split(':')[1];
    const productList = Array.from(products).slice(0, 3);
    console.log(`Subcategory ${subcatCode}: ${productList.join(' | ')}`);
  }
  
  // Show department counts
  console.log('\n📊 PRODUCT COUNT BY DEPARTMENT:');
  console.log('===============================');
  for (const dept of sortedDepartments) {
    const count = lines.filter(line => {
      const fields = line.split(';');
      return fields[3] === dept;
    }).length;
    const category = Array.from(departmentMap.get(dept)!)[0];
    console.log(`Department ${dept.padStart(2, '0')} (${category}): ${count.toLocaleString()} products`);
  }
}

extractRSRMapping().catch(console.error);